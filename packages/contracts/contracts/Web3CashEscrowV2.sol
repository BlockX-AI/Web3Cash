// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title Web3CashEscrowV2
 * @notice Enhanced escrow with per-campaign balance tracking
 * @dev Supports both platform-funded and creator-funded campaigns
 */
contract Web3CashEscrowV2 is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;

    IERC20 public immutable USDC;
    address public attestor;

    struct Campaign {
        address creator;
        uint256 balance;      // Funds deposited by creator
        uint256 spent;        // Funds paid out to users
        bool active;
    }

    mapping(bytes32 => Campaign) public campaigns;
    mapping(bytes32 => bool) public claimed;

    uint256 public platformReserve; // Platform's own funds for subsidizing

    event CampaignCreated(bytes32 indexed campaignId, address indexed creator);
    event CampaignFunded(bytes32 indexed campaignId, address indexed funder, uint256 amount);
    event Claimed(bytes32 indexed campaignId, address indexed recipient, uint256 amount, bytes32 claimId);
    event CampaignWithdrawn(bytes32 indexed campaignId, address indexed creator, uint256 amount);
    event PlatformReserveFunded(address indexed funder, uint256 amount);
    event CampaignDeactivated(bytes32 indexed campaignId);
    event AttestorUpdated(address indexed oldAttestor, address indexed newAttestor);

    error CampaignExists();
    error CampaignNotActive();
    error ZeroAmount();
    error ClaimExpired();
    error AlreadyClaimed();
    error InvalidSignature();
    error InsufficientFunds();
    error NotCreator();
    error InsufficientBalance();
    error CampaignNotFound();

    constructor(address _usdc, address _attestor) Ownable(msg.sender) {
        require(_usdc != address(0), "invalid USDC address");
        require(_attestor != address(0), "invalid attestor");
        USDC = IERC20(_usdc);
        attestor = _attestor;
    }

    /**
     * @notice Create a new campaign (free, no funds required)
     * @param campaignId Unique identifier for the campaign
     */
    function createCampaign(bytes32 campaignId) external {
        if (campaigns[campaignId].creator != address(0)) revert CampaignExists();

        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            balance: 0,
            spent: 0,
            active: true
        });

        emit CampaignCreated(campaignId, msg.sender);
    }

    /**
     * @notice Fund a campaign (can be called multiple times)
     * @param campaignId Campaign to fund
     * @param amount Amount of USDC to deposit
     */
    function fundCampaign(bytes32 campaignId, uint256 amount) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (!campaign.active) revert CampaignNotActive();
        if (campaign.creator == address(0)) revert CampaignNotFound();
        if (amount == 0) revert ZeroAmount();

        require(USDC.transferFrom(msg.sender, address(this), amount), "transfer failed");
        campaign.balance += amount;

        emit CampaignFunded(campaignId, msg.sender, amount);
    }

    /**
     * @notice Platform can add funds to reserve for subsidizing campaigns
     * @param amount Amount of USDC to add to platform reserve
     */
    function fundPlatformReserve(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        require(USDC.transferFrom(msg.sender, address(this), amount), "transfer failed");
        platformReserve += amount;

        emit PlatformReserveFunded(msg.sender, amount);
    }

    /**
     * @notice Claim reward (uses campaign balance first, then platform reserve)
     * @param campaignId Campaign the reward is from
     * @param recipient User receiving the reward
     * @param amount Amount of USDC to claim
     * @param claimId Unique claim identifier
     * @param deadline Claim expiration timestamp
     * @param signature Attestor's signature
     */
    function claim(
        bytes32 campaignId,
        address recipient,
        uint256 amount,
        bytes32 claimId,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert ClaimExpired();
        if (claimed[claimId]) revert AlreadyClaimed();

        Campaign storage campaign = campaigns[campaignId];
        if (!campaign.active) revert CampaignNotActive();
        if (campaign.creator == address(0)) revert CampaignNotFound();

        // Verify attestor signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(campaignId, recipient, amount, claimId, deadline)
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        
        if (signer != attestor) revert InvalidSignature();

        // Try to use campaign balance first
        if (campaign.balance >= amount) {
            campaign.balance -= amount;
        } else {
            // Use platform reserve to cover shortfall
            uint256 shortfall = amount - campaign.balance;
            if (platformReserve < shortfall) revert InsufficientFunds();

            platformReserve -= shortfall;
            campaign.balance = 0;
        }

        campaign.spent += amount;
        claimed[claimId] = true;

        require(USDC.transfer(recipient, amount), "transfer failed");

        emit Claimed(campaignId, recipient, amount, claimId);
    }

    /**
     * @notice Campaign creator can withdraw unused funds
     * @param campaignId Campaign to withdraw from
     * @param amount Amount to withdraw
     */
    function withdrawCampaignFunds(bytes32 campaignId, uint256 amount) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (msg.sender != campaign.creator) revert NotCreator();
        if (campaign.balance < amount) revert InsufficientBalance();

        campaign.balance -= amount;
        require(USDC.transfer(msg.sender, amount), "transfer failed");

        emit CampaignWithdrawn(campaignId, msg.sender, amount);
    }

    /**
     * @notice Deactivate campaign (prevents new claims)
     * @param campaignId Campaign to deactivate
     */
    function deactivateCampaign(bytes32 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];
        if (msg.sender != campaign.creator) revert NotCreator();
        
        campaign.active = false;
        emit CampaignDeactivated(campaignId);
    }

    /**
     * @notice Update attestor address (owner only)
     * @param _attestor New attestor address
     */
    function setAttestor(address _attestor) external onlyOwner {
        require(_attestor != address(0), "invalid attestor");
        address oldAttestor = attestor;
        attestor = _attestor;
        emit AttestorUpdated(oldAttestor, _attestor);
    }

    /**
     * @notice Get campaign details
     * @param campaignId Campaign identifier
     * @return creator Campaign creator address
     * @return balance Current campaign balance
     * @return spent Total amount spent from campaign
     * @return active Whether campaign is active
     */
    function getCampaign(bytes32 campaignId) 
        external 
        view 
        returns (
            address creator,
            uint256 balance,
            uint256 spent,
            bool active
        ) 
    {
        Campaign storage campaign = campaigns[campaignId];
        return (
            campaign.creator,
            campaign.balance,
            campaign.spent,
            campaign.active
        );
    }

    /**
     * @notice Get total available funds for a campaign (campaign balance + platform reserve)
     * @param campaignId Campaign identifier
     * @return Total available funds
     */
    function getAvailableFunds(bytes32 campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        return campaign.balance + platformReserve;
    }

    /**
     * @notice Emergency withdraw for owner (use with caution)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(USDC.transfer(msg.sender, amount), "transfer failed");
    }
}
