import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockERC721, MockERC20, NFTStaking } from "../typechain";
import { parseUnits } from "ethers/lib/utils";
import { expect } from "chai";

describe("NFTStaking.sol", () => {
  // ---
  // fixtures
  // ---

  let nft: MockERC721;
  let token: MockERC20;
  let staking: NFTStaking;
  let accounts: SignerWithAddress[];
  let a0: string, a1: string, a2: string, a3: string;

  beforeEach(async () => {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    const NFTStaking = await ethers.getContractFactory("NFTStaking");
    [nft, token, staking, accounts] = await Promise.all([
      MockERC721.deploy(),
      MockERC20.deploy(),
      NFTStaking.deploy(),
      ethers.getSigners(),
    ]);
    [a0, a1, a2, a3] = accounts.map((a) => a.address);

    // admin setup
    const initialDeposit = parseUnits("1000000");
    await token.mint(initialDeposit);
    await token.approve(staking.address, initialDeposit);
    await staking.setup(nft.address, token.address, initialDeposit);

    // holder setup
    await nft.setApprovalForAll(staking.address, true);
  });

  it("should support staking and unstaking a single NFT", async () => {
    const tokenId = "1";
    await nft.mint(tokenId);
    expect(await nft.balanceOf(a0)).to.equal(1);
    await staking.stakeNFTs([tokenId]);
    expect(await nft.balanceOf(a0)).to.equal(0);
    await staking.claimAndUnstakeNFTs([tokenId]);
    expect(await nft.balanceOf(a0)).to.equal(1);
    //
  });
  it("should unstaking a subset of staked NFTs", async () => {
    //
  });
  it("should allow permissionlessly 3rd party claiming", async () => {
    //
  });
  it("should revert if staking an unowned NFT", async () => {
    //
  });
  it("should revert if attempting to set cutoff in the past", async () => {
    //
  });
  it("should revert if duplicate token IDs when staking", async () => {
    //
  });
  it("should revert if duplicate token IDs when unstaking", async () => {
    //
  });
  it("should revert if unstaking an unstaked NFT", async () => {
    //
  });
  it("should revert if unstaking an NFT staked by a different address", async () => {
    //
  });
  it("should revert setting up with an invalid nft", async () => {
    //
  });
  it("should revert setting up with an invalid token", async () => {
    //
  });
  it("should revert setting up more than once", async () => {
    //
  });
});
