import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockERC721, MockERC20, NFTStaking } from "../typechain";
import { parseUnits } from "ethers/lib/utils";

describe("basic staking and unstaking", () => {
  describe("NFTStaking", () => {
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
      await staking.stakeNFTs([tokenId]);
      await staking.claimAndUnstakeNFTs([tokenId]);
      //
    });
    it("should revert if staking an unowned NFT", async () => {
      //
    });
    it("should revert if unstaking an unstaked NFT", async () => {
      //
    });
    it("should revert if unstaking an NFT staked by a different address", async () => {
      //
    });
  });
});
