//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

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
    uint256 public constant DAILY_RATE = 1 ether;

    // ---
    // Storage
    // ---

    /// @notice The NFT that can be staked in this contract.
    IERC721 public nft;

    /// @notice The token that is rewarded for staking.
    IERC20 public token;

    mapping(address => AccountStake) private _stakes;

    // ---
    // Events
    // ---

    /// @notice An NFT was staked into the contract.
    event NFTStaked(address owner, uint256 tokenId);

    /// @notice An NFT was unstaked from the contract.
    event NFTUnstaked(address owner, uint256 tokenId);

    /// @notice Tokens were claimed.
    event TokensClaimed(address owner, uint256 amount);

    // ---
    // Errors
    // ---

    /// @notice Staking contract was already setup.
    error AlreadySetup();

    /// @notice Setup was attempted with an invalid token or nft reference.
    error InvalidTokens();

    /// @notice An invalid NFT was attempted to be unstaked.
    error InvalidNFT();

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

        // check that the addresses are valid
        if (!IERC165(nft).supportsInterface(type(IERC721).interfaceId))
            revert InvalidTokens();
        try token.totalSupply() {
            // nop
        } catch {
            revert InvalidTokens();
        }

        if (deposit_ > 0) {
            // will revert if staking not approved by msg.sender, or msg.sender
            // has insufficient balance
            token.transferFrom(msg.sender, address(this), deposit_);
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
            emit NFTStaked(msg.sender, tokenId);
        }
    }

    function _claimFor(address account) internal {
        uint256 claimable = getClaimable(account);
        if (claimable == 0) return; // allow nop
        _stakes[account].lastClaimTime = block.timestamp;
        _stakes[account].earned = 0;
        emit TokensClaimed(account, claimable);

        // reverts if insufficient rewards reserves
        token.transfer(account, claimable);
    }

    /// @notice Claim all earned tokens for msg.sender
    function claim() public {
        _claimFor(msg.sender);
    }

    /// @notice Claim tokens on behalf of another account. Permissionless
    function claimFor(address account) external {
        _claimFor(account);
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
            emit NFTUnstaked(msg.sender, tokenId);
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

    /// @notice Returns the total NFTs that have been staked by an account
    function getStakedBalance(address account) public view returns (uint256) {
        return _stakes[account].stakedCount;
    }
}
