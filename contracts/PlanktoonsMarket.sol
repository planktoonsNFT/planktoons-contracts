//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {MerkleMarket, Order} from "./MerkleMarket.sol";
import {MerkleAirdrop} from "./MerkleAirdrop.sol";
import {NFTStaking} from "./NFTStaking.sol";
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";

contract PlanktoonsMarket is MerkleMarket {
    // ---
    // Errors
    // ---

    /// @notice Setup function was called more than once.
    error AlreadySetup();

    // ---
    // Storage
    // ---

    string public constant name = "PlanktoonsMarket";

    /// @notice The Planktoons nft contract
    IERC721 public nft;

    /// @notice The Planktoons staking contract.
    NFTStaking public staking;

    /// @notice The Planktoons airdrop contract.
    MerkleAirdrop public airdrop;

    // ---
    // Admin functionality
    // ---

    /// @notice Initialize the market contract.
    function setup(
        IERC721 nft_,
        NFTStaking staking_,
        MerkleAirdrop airdrop_,
        bytes32 root
    ) external onlyOwner {
        if (
            address(nft) != address(0) ||
            address(staking) != address(0) ||
            address(airdrop) != address(0)
        ) {
            revert AlreadySetup();
        }

        nft = nft_;
        staking = staking_;
        airdrop = airdrop_;

        setInventoryRoot(root);
    }

    // ---
    // End user functionality
    // ---

    /// @notice Convenience function to claim from airdrop and staking contracts
    /// before purchasing from the market to save holders a few transactions.
    function claimAllAndPurchase(
        Order[] calldata orders,
        uint256 airdropMaxClaimable,
        bytes32[] calldata airdropProof
    ) external {
        // if nothing staked, nop is safe
        staking.claimFor(msg.sender);

        // only attempt airdrop claim if > 0, allows skipping by setting max
        // claimable to 0 and passing in an empty array as proof
        if (airdropMaxClaimable > 0) {
            airdrop.claimFor(msg.sender, airdropMaxClaimable, airdropProof);
        }

        purchase(orders);
    }
}
