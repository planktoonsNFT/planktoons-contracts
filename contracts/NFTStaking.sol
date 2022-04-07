//SPDX-License-Identifier: None
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

struct AccountStake {
    uint256 earned;
    uint256 lastClaimTime;
    uint256 stakedCount;
    mapping(uint256 => bool) stakedTokens;
}

/// @notice A simple NFT staking contract to emit deposited reserves to stakers
/// as claimable tokens.
contract NFTStaking is Ownable {
    /// @notice The amount of tokens that are emitted per day per NFT.
    uint256 public immutable DAILY_RATE = 1 ether;

    /// @notice The NFT that can be staked in this contract.
    IERC721 public nft;

    /// @notice The token that is emitted from this contract.
    IERC20 public token;

    /// @notice Staking contract was already setup.
    error AlreadySetup();

    /// @notice An invalid NFT was attempted to be unstaked.
    error InvalidNFT();

    mapping(address => AccountStake) private _stakes;

    // ---
    // Admin functionality
    // ---

    /// @notice Set the NFT and token contracts.
    function setup(
        IERC721 nft_,
        IERC20 token_,
        uint256 deposit_
    ) external onlyOwner {
        if (nft != IERC721(address(0))) revert AlreadySetup();

        nft = nft_;
        token = token_;

        if (deposit_ > 0) {
            token.transferFrom(msg.sender, address(this), deposit_); // reverts if not approved
            // TODO: event
        }
    }

    // ---
    // Holder functionality
    // ---

    /// @notice Stake multiple NFTs
    function stakeNFTs(uint256[] memory tokenIds) external {
        _stakes[msg.sender].earned = getClaimable(msg.sender);
        _stakes[msg.sender].lastClaimTime = block.timestamp;
        _stakes[msg.sender].stakedCount += tokenIds.length;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            _stakes[msg.sender].stakedTokens[tokenId] = true;
            nft.transferFrom(msg.sender, address(this), tokenId); // reverts if not approved
        }
    }

    /// @notice Claim all earned tokens for msg.sender
    function claim() public {
        uint256 claimable = getClaimable(msg.sender);
        token.transfer(msg.sender, claimable); // reverts if insufficient balance
        _stakes[msg.sender].lastClaimTime = block.timestamp;
        _stakes[msg.sender].earned = 0;
        // TODO: event
    }

    /// @notice Claim all unearned tokens and unstake a subset of staked NFTs
    function claimAndUnstakeNFTs(uint256[] memory tokenIds) external {
        claim();
        _stakes[msg.sender].stakedCount -= tokenIds.length;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            if (!_stakes[msg.sender].stakedTokens[tokenId]) revert InvalidNFT();
            delete _stakes[msg.sender].stakedTokens[tokenId];
            nft.transferFrom(address(this), msg.sender, tokenId);
        }
    }

    // ---
    // Views
    // ---

    /// @notice Returns the total claimable tokens for a given account.
    function getClaimable(address account) public view returns (uint256) {
        uint256 delta = block.timestamp - _stakes[account].lastClaimTime;
        uint256 emitted = (_stakes[account].stakedCount * DAILY_RATE * delta) /
            1 days;
        return emitted + _stakes[account].earned;
    }
}
