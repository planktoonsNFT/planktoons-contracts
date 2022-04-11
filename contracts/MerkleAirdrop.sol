//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

contract MerkleAirdrop is Ownable {
    // ---
    // Events
    // ---

    /// @notice The merkle root of the claim list tree was updated.
    event ClaimListRootUpdated(bytes32 root);

    /// @notice Tokens were claimed for a recipient
    event TokensClaimed(address recipient, uint256 amount);

    // ---
    // Errors
    // ---

    /// @notice The contract has already been set up
    error AlreadySetup();

    /// @notice A claim was attempted with an invalid claim list proof.
    error InvalidClaim();

    // ---
    // Storage
    // ---

    /// @notice The merkle root of the claim list tree.
    bytes32 public claimListRoot;

    /// @notice The airdropped token
    IERC20 public token;

    // tokens claimed so far
    mapping(address => uint256) private _claimed;

    // ---
    // Admin
    // ---

    /// @notice Set the airdropped token, merkle root, and do an initial deposit
    function setup(
        IERC20 token_,
        uint256 deposit,
        bytes32 root
    ) external onlyOwner {
        if (token != IERC20(address(0))) revert AlreadySetup();

        token = token_;
        claimListRoot = root;
        emit ClaimListRootUpdated(root);

        // reverts if contract not approved to spend msg.sender tokens
        // reverts if insufficient balance in msg.sender
        // reverts if invalid token reference
        // reverts if deposit = 0
        token_.transferFrom(msg.sender, address(this), deposit);
    }

    /// @notice Set the merkle root of the claim tree.
    function setClaimListRoot(bytes32 root) external onlyOwner {
        claimListRoot = root;
        emit ClaimListRootUpdated(root);
    }

    // ---
    // End users
    // ---

    /// @notice Claim airdropped tokens
    function claim(uint256 maxAmount, bytes32[] calldata proof)
        external
        returns (uint256)
    {
        return _claimFor(msg.sender, maxAmount, proof);
    }

    function _claimFor(
        address recipient,
        uint256 maxAmount,
        bytes32[] calldata proof
    ) internal returns (uint256) {
        // TODO: assert proof is correct

        uint256 claimed = _claimed[recipient];
        uint256 toClaim = claimed < maxAmount ? maxAmount - claimed : 0;

        // silent nop
        if (toClaim == 0) return 0;

        _claimed[recipient] = maxAmount;
        emit TokensClaimed(recipient, toClaim);

        // reverts if insufficient reserve balance
        token.transfer(recipient, toClaim);

        return toClaim;
    }
}
