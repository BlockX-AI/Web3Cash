// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title Web3CashRegistry
 * @notice Append-only mapping of (wallet, platform) -> handleHash, gated by a
 *         trusted off-chain attestor (the Web3Cash backend).
 *
 * @dev Why on-chain?
 *      Phase 6 surfaces wallet ↔ social bindings to other dApps so they can
 *      Sybil-gate without re-running OAuth. The mapping is immutable per
 *      (wallet, platform) pair to prevent re-targeting attacks.
 *
 * Trust model:
 *   - Only an `attestor` signature is accepted. The attestor is rotated by the
 *     `owner` (Web3Cash multisig). Any user can submit a binding so long as it
 *     carries the attestor's EIP-712 signature, which removes the platform
 *     from the broadcast hot path.
 *   - The attestor signs `Bind(wallet, platform, handleHash, nonce, deadline)`
 *     where:
 *       - `platform` is keccak256("TWITTER") | keccak256("DISCORD") | ...
 *       - `handleHash` is keccak256(bytes(handle)) — a privacy-preserving
 *         commitment, not the raw username.
 *       - `nonce` is per-wallet to prevent replay across platforms.
 *       - `deadline` bounds signature validity.
 */
contract Web3CashRegistry is Ownable, EIP712 {
    bytes32 public constant BIND_TYPEHASH =
        keccak256(
            "Bind(address wallet,bytes32 platform,bytes32 handleHash,uint256 nonce,uint256 deadline)"
        );

    /// Active attestor — the only key whose signatures we accept on `bind`.
    address public attestor;

    /// wallet => platform => handleHash. Zero means "not bound".
    mapping(address => mapping(bytes32 => bytes32)) private _bindings;

    /// wallet => next valid bind nonce.
    mapping(address => uint256) public nonces;

    event AttestorRotated(address indexed previous, address indexed current);
    event Bound(
        address indexed wallet,
        bytes32 indexed platform,
        bytes32 handleHash,
        uint256 nonce
    );

    error InvalidAttestor();
    error AlreadyBound();
    error SignatureExpired();
    error InvalidSignature();
    error WalletMismatch();

    constructor(
        address initialOwner,
        address initialAttestor
    ) EIP712("Web3CashRegistry", "1") Ownable(initialOwner) {
        if (initialAttestor == address(0)) revert InvalidAttestor();
        attestor = initialAttestor;
        emit AttestorRotated(address(0), initialAttestor);
    }

    function setAttestor(address newAttestor) external onlyOwner {
        if (newAttestor == address(0)) revert InvalidAttestor();
        emit AttestorRotated(attestor, newAttestor);
        attestor = newAttestor;
    }

    /**
     * @notice Submit an attestor-signed binding for `wallet` on `platform`.
     * @dev Anyone may relay the signed message. We do NOT require msg.sender
     *      to equal `wallet` so the user doesn't have to hold gas.
     */
    function bind(
        address wallet,
        bytes32 platform,
        bytes32 handleHash,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (_bindings[wallet][platform] != bytes32(0)) revert AlreadyBound();

        uint256 nonce = nonces[wallet];
        bytes32 structHash = keccak256(
            abi.encode(
                BIND_TYPEHASH,
                wallet,
                platform,
                handleHash,
                nonce,
                deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        address recovered = ECDSA.recover(digest, signature);
        if (recovered != attestor) revert InvalidSignature();

        _bindings[wallet][platform] = handleHash;
        unchecked {
            nonces[wallet] = nonce + 1;
        }
        emit Bound(wallet, platform, handleHash, nonce);
    }

    /// @notice Read the handle hash bound to (wallet, platform). Zero if unset.
    function bindingOf(
        address wallet,
        bytes32 platform
    ) external view returns (bytes32) {
        return _bindings[wallet][platform];
    }

    /// @notice Convenience: hash a UTF-8 platform name (e.g. "TWITTER").
    function platformId(string calldata name) external pure returns (bytes32) {
        return keccak256(bytes(name));
    }

    /// @notice EIP-712 domain separator for off-chain signing tooling.
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
