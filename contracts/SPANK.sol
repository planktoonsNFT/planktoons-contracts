//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Planktoons $SPANK token
contract SPANK is ERC20, Ownable {
    constructor() ERC20("Spank", "SPANK") {}

    /// @notice Mint tokens to msg sender. Only callable by owner
    function mint(uint256 amount) external onlyOwner {
        _mint(msg.sender, amount);
    }
}
