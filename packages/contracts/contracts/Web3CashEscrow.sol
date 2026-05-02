// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Web3CashEscrow
 * @notice Per-campaign USDC escrow that pays users via attestor-signed
 *         claim authorisations.
 *
 * @dev Lifecycle:
 *      1. Project creates a campaign via `createCampaign(...)` and pulls in
 *         USDC via ERC-20 `transferFrom` (escrow holds the funds).
 *      2. Web3Cash backend signs an EIP-712 `Claim` for each verified user
 *         completion: (campaignId, recipient, amount, claimId, deadline).
 *      3. The recipient (or any relayer) calls `claim(...)`. The escrow
 *         verifies the attestor sig, debits the campaign balance, and
 *         transfers USDC.
 *      4. Project may `withdrawRemaining(...)` after `endsAt` (or anytime
 *         while campaign is paused) to claw back unspent budget.
 *
 * Trust model:
 *   - `owner` (Web3Cash multisig) sets the global attestor and may pause.
 *   - `attestor` is the hot wallet that the backend uses to sign claims.
 *   - Each campaign has a `funder` who deposited and may reclaim.
 *   - `claimId` is enforced unique per campaign (one-shot).
 */
contract Web3CashEscrow is Ownable, EIP712, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant CLAIM_TYPEHASH =
        keccak256(
            "Claim(bytes32 campaignId,address recipient,uint256 amount,bytes32 claimId,uint256 deadline)"
        );

    /// Single ERC-20 token (USDC) this escrow handles. Set at construction.
    IERC20 public immutable token;

    /// Attestor key whose signatures authorise claims.
    address public attestor;

    struct Campaign {
        address funder;
        uint128 deposited;
        uint128 paid;
        uint64 endsAt; // 0 = no end
        bool exists;
    }

    /// campaignId => campaign state.
    mapping(bytes32 => Campaign) public campaigns;

    /// campaignId => claimId => used.
    mapping(bytes32 => mapping(bytes32 => bool)) public claimed;

    event AttestorRotated(address indexed previous, address indexed current);
    event CampaignCreated(
        bytes32 indexed campaignId,
        address indexed funder,
        uint256 amount,
        uint64 endsAt
    );
    event CampaignTopUp(
        bytes32 indexed campaignId,
        address indexed funder,
        uint256 amount
    );
    event Claimed(
        bytes32 indexed campaignId,
        address indexed recipient,
        bytes32 indexed claimId,
        uint256 amount
    );
    event Withdrawn(
        bytes32 indexed campaignId,
        address indexed to,
        uint256 amount
    );

    error InvalidAttestor();
    error CampaignAlreadyExists();
    error CampaignNotFound();
    error CampaignActive();
    error AlreadyClaimed();
    error ClaimExpired();
    error InvalidSignature();
    error InsufficientBalance();
    error NotFunder();
    error ZeroAmount();

    constructor(
        IERC20 token_,
        address initialOwner,
        address initialAttestor
    ) EIP712("Web3CashEscrow", "1") Ownable(initialOwner) {
        if (address(token_) == address(0)) revert InvalidAttestor();
        if (initialAttestor == address(0)) revert InvalidAttestor();
        token = token_;
        attestor = initialAttestor;
        emit AttestorRotated(address(0), initialAttestor);
    }

    function setAttestor(address newAttestor) external onlyOwner {
        if (newAttestor == address(0)) revert InvalidAttestor();
        emit AttestorRotated(attestor, newAttestor);
        attestor = newAttestor;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Create a new campaign and pull `amount` USDC from `msg.sender`.
     * @param campaignId Off-chain UUID hashed to bytes32 (e.g. keccak256(uuid)).
     * @param amount Initial budget in USDC atomic units (6 decimals).
     * @param endsAt Unix timestamp after which the funder can reclaim. 0 = open.
     */
    function createCampaign(
        bytes32 campaignId,
        uint256 amount,
        uint64 endsAt
    ) external nonReentrant whenNotPaused {
        if (campaigns[campaignId].exists) revert CampaignAlreadyExists();
        if (amount == 0) revert ZeroAmount();

        campaigns[campaignId] = Campaign({
            funder: msg.sender,
            deposited: _safe128(amount),
            paid: 0,
            endsAt: endsAt,
            exists: true
        });

        token.safeTransferFrom(msg.sender, address(this), amount);
        emit CampaignCreated(campaignId, msg.sender, amount, endsAt);
    }

    /// @notice Add more budget to an existing campaign. Anyone may top up.
    function topUp(
        bytes32 campaignId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        Campaign storage c = campaigns[campaignId];
        if (!c.exists) revert CampaignNotFound();
        if (amount == 0) revert ZeroAmount();

        c.deposited = _safe128(uint256(c.deposited) + amount);
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit CampaignTopUp(campaignId, msg.sender, amount);
    }

    /**
     * @notice Settle a verified completion. Anyone may relay this.
     * @param signature EIP-712 signature from the current attestor over Claim.
     */
    function claim(
        bytes32 campaignId,
        address recipient,
        uint256 amount,
        bytes32 claimId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        if (block.timestamp > deadline) revert ClaimExpired();
        if (amount == 0) revert ZeroAmount();
        if (claimed[campaignId][claimId]) revert AlreadyClaimed();

        Campaign storage c = campaigns[campaignId];
        if (!c.exists) revert CampaignNotFound();
        if (uint256(c.deposited) - uint256(c.paid) < amount)
            revert InsufficientBalance();

        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                campaignId,
                recipient,
                amount,
                claimId,
                deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != attestor) revert InvalidSignature();

        claimed[campaignId][claimId] = true;
        c.paid = _safe128(uint256(c.paid) + amount);

        token.safeTransfer(recipient, amount);
        emit Claimed(campaignId, recipient, claimId, amount);
    }

    /**
     * @notice Funder reclaims unspent budget. Allowed when:
     *           - campaign endsAt has passed, OR
     *           - the contract is paused (emergency).
     */
    function withdrawRemaining(
        bytes32 campaignId,
        address to
    ) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        if (!c.exists) revert CampaignNotFound();
        if (msg.sender != c.funder) revert NotFunder();

        bool ended = c.endsAt != 0 && block.timestamp >= c.endsAt;
        if (!ended && !paused()) revert CampaignActive();

        uint256 remaining = uint256(c.deposited) - uint256(c.paid);
        if (remaining == 0) revert ZeroAmount();

        c.paid = c.deposited; // fully drained
        token.safeTransfer(to, remaining);
        emit Withdrawn(campaignId, to, remaining);
    }

    /// @notice Remaining (unpaid) budget for a campaign.
    function remainingOf(bytes32 campaignId) external view returns (uint256) {
        Campaign storage c = campaigns[campaignId];
        if (!c.exists) return 0;
        return uint256(c.deposited) - uint256(c.paid);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function _safe128(uint256 v) private pure returns (uint128) {
        require(v <= type(uint128).max, "overflow");
        return uint128(v);
    }
}
