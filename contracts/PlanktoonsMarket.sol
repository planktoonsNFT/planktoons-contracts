//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*

    Planktoons market contract
      https://planktoons.io

*/

import {MerkleMarket, Order} from "./MerkleMarket.sol";
import {MerkleAirdrop} from "./MerkleAirdrop.sol";
import {NFTStaking} from "./NFTStaking.sol";
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";

contract PlanktoonsMarket is MerkleMarket {
    // ---
    // Storage
    // ---

    string public constant name = "PlanktoonsMarket";

    /// @notice The Planktoons nft contract
    IERC721 public immutable nft;

    /// @notice The Planktoons staking contract.
    NFTStaking public immutable staking;

    /// @notice The Planktoons airdrop contract.
    MerkleAirdrop public immutable airdrop;

    constructor(IERC721 nft_, NFTStaking staking_, MerkleAirdrop airdrop_) {
        nft = nft_;
        staking = staking_;
        airdrop = airdrop_;
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
