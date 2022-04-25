import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockERC721, MockERC20, NFTStaking } from "../typechain";
import { formatUnits, parseUnits } from "ethers/lib/utils";
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

  const mineNextBlock = () => ethers.provider.send("evm_mine", []);
  const setAutomine = (set = true) =>
    ethers.provider.send("evm_setAutomine", [set]);

  const increaseTimestampAndMineNextBlock = async (offsetInSeconds: number) => {
    await ethers.provider.send("evm_increaseTime", [offsetInSeconds]);
    await mineNextBlock();
  };

  afterEach(() => setAutomine(true));

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
    await nft.mint("1");
    await nft.mint("2");
    await nft.mint("3");
    expect(await nft.balanceOf(a0)).to.equal(3);
    await staking.stakeNFTs(["1", "2", "3"]);
    expect(await staking.getStakedBalance(a0)).to.equal(3);
    await staking.claimAndUnstakeNFTs(["2"]);
    expect(await staking.getStakedBalance(a0)).to.equal(2);
    expect(await nft.balanceOf(a0)).to.equal(1);
  });
  it("should allow emergency unstaking of NFTs even when reserves are empty", async () => {
    const NFTStaking = await ethers.getContractFactory("NFTStaking");
    const staking = await NFTStaking.deploy();
    await token.approve(staking.address, parseUnits("1"));
    await nft.setApprovalForAll(staking.address, true);

    await nft.mint("1");
    await token.mint(parseUnits("1"));
    await staking.setup(nft.address, token.address, parseUnits("1"));
    await staking.stakeNFTs(["1"]);
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 10);

    // not enough reserve tokens
    await expect(staking.claimAndUnstakeNFTs(["1"])).to.be.revertedWith(
      "transfer amount exceeds balance"
    );
    await staking.emergencyUnstake(["1"]); // doesnt revert
    expect(await nft.ownerOf("1")).to.equal(a0);
  });
  it("should allow permissionlessly 3rd party claiming", async () => {
    await nft.connect(accounts[1]).mint("1");
    await nft.connect(accounts[1]).setApprovalForAll(staking.address, true);
    await setAutomine(false);
    await staking.connect(accounts[1]).stakeNFTs(["1"]);
    await mineNextBlock();
    await staking.connect(accounts[2]).claimFor(accounts[1].address);
    await increaseTimestampAndMineNextBlock(60 * 60 * 24);
    expect(await token.balanceOf(accounts[1].address)).to.equal(
      parseUnits("1")
    );
  });
  it("should revert if staking an unowned NFT", async () => {
    await nft.mint("1");
    await expect(
      staking.connect(accounts[1]).stakeNFTs(["1"])
    ).to.be.revertedWith("NotTokenOwner()");
  });
  it("should revert if attempting to set cutoff in the past", async () => {
    const { timestamp } = await ethers.provider.getBlock("latest");
    await expect(
      staking.depositRewards(0, timestamp - 1000)
    ).to.be.revertedWith("InvalidRewardUntilTimestamp()");
  });
  it("should revert if duplicate token IDs when staking", async () => {
    await nft.mint("1");
    await expect(
      staking.connect(accounts[1]).stakeNFTs(["1", "1"])
    ).to.be.revertedWith("NotTokenOwner()");
  });
  it("should revert if duplicate token IDs when unstaking", async () => {
    await nft.mint("1");
    await staking.stakeNFTs(["1"]);
    await expect(staking.claimAndUnstakeNFTs(["1", "1"])).to.be.reverted;
  });
  it("should revert if unstaking an unstaked NFT", async () => {
    await nft.mint("1");
    await staking.stakeNFTs(["1"]);
    await staking.claimAndUnstakeNFTs(["1"]);
    await expect(staking.claimAndUnstakeNFTs(["1"])).to.be.reverted;
  });
  it("should revert if unstaking an NFT staked by a different address", async () => {
    await nft.mint("1");
    await staking.stakeNFTs(["1"]);

    // ensuring we dont fail earlier
    await nft.connect(accounts[1]).mint("2");
    await nft.connect(accounts[1]).setApprovalForAll(staking.address, true);
    await staking.connect(accounts[1]).stakeNFTs(["2"]);

    await expect(
      staking.connect(accounts[1]).claimAndUnstakeNFTs(["1"])
    ).to.be.revertedWith("InvalidUnstake()");
  });
  it("should revert setting up more than once", async () => {
    await expect(
      staking.setup(nft.address, token.address, parseUnits("1000"))
    ).to.be.revertedWith("AlreadySetup()");
  });
  it("should revert setting up by non owner", async () => {
    await expect(
      staking
        .connect(accounts[1])
        .setup(nft.address, token.address, parseUnits("1000"))
    ).to.be.revertedWith("caller is not the owner");
  });
  it("should not continue yielding rewards after cutoff date", async () => {
    await nft.mint("1");
    await staking.stakeNFTs(["1"]);
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 365 * 5); // 5 years later
    await staking.claim();
    const balance = await token.balanceOf(a0);
    expect(balance.lt(parseUnits("365"))).to.equal(true);
  });
});
