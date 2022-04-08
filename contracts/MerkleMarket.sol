//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

struct Order {
    string itemId;
    IERC20 token;
    uint256 unitPrice;
    uint256 maxAmount;
    bytes32[] proof;
    uint256 amount;
}

/// @notice Simple marketplace (eg, for community prizes) that stores inventory
/// off chain and requires a proof to be submitted when purchasing
contract MerkleMarket is Ownable {
    // ---
    // Events
    // ---

    /// @notice An item was purchased from the market
    event ItemPurchased(
        string itemId,
        IERC20 token,
        uint256 unitPrice,
        uint256 amount
    );

    // ---
    // Errors
    // ---

    /// @notice A purchase was attempted for an item that is out of stock
    error NoRemainingSupply();

    /// @notice A purchase was attempted with an invalid inventory proof
    error InvalidItem();

    // ---
    // Storage
    // ---

    // merkle root of the inventory tree
    bytes32 public inventoryRoot;

    // item ID -> total purchased so far
    mapping(string => uint256) private _purchased;

    // ---
    // Admin functionality
    // ---

    /// @notice set the merkle root of the inventory tree
    function setInventoryRoot(bytes32 root) external onlyOwner {
        inventoryRoot = root;
    }

    /// @notice withdraw tokens from the marketplace
    function withdraw(IERC20 token) external onlyOwner {
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    // ---
    // Main functionality
    // ---

    /// @notice Purchase items from the marketplace
    function purchase(Order[] calldata orders) external {
        for (uint256 i = 0; i < orders.length; i++) {
            // TODO: assert proof is correct

            // make sure there is remaining supply and update the total purchase
            // count for this item
            uint256 nextCount = _purchased[orders[i].itemId] + orders[i].amount;
            if (nextCount > orders[i].maxAmount) revert NoRemainingSupply();
            _purchased[orders[i].itemId] = nextCount;

            // execute the token transfer
            orders[i].token.transferFrom(
                msg.sender,
                address(this),
                orders[i].unitPrice * orders[i].amount
            );

            emit ItemPurchased(
                orders[i].itemId,
                orders[i].token,
                orders[i].unitPrice,
                orders[i].amount
            );
        }
    }
}
