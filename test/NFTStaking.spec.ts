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
    await token.approve(staking.address, parseUnits("100000000000000000000"));
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
    await expect(staking.claimAndUnstakeNFTs(["1"])).to.be.reverted;
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
  it("should not increase reward accumulator when emergency unstaking", async () => {
    await nft.mint("1");
    await nft.mint("2");
    await setAutomine(false);
    await staking.stakeNFTs(["1"]);
    await mineNextBlock(); // staked
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 30); // 30 days later
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("30"));

    await staking.stakeNFTs(["2"]); // flushes to accumulator
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // 1 day later -> stake
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // 1 day later
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("33")); // 32 + 1

    await staking.emergencyUnstake(["1"]);
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // 1 day later -> unstake
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("35")); // 33 + 2

    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 10); // 10 days later
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("45")); // 35 + 10
    await staking.emergencyUnstake(["2"]);
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // 1 day later -> unstake
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("46"));

    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 10); // 10 days later
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("46"));

    await staking.claim();
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // 1 day later -> claim
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("0"));
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 10); // 10 days later
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("0"));
  });
  it("should not allow emergency unstaking invalid tokens", async () => {
    await nft.mint("1");
    await nft.mint("2");
    await staking.stakeNFTs(["1", "2"]);

    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // 1 day later
    await staking.emergencyUnstake(["2"]);
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // 1 day later
    await expect(staking.emergencyUnstake(["2"])).to.be.revertedWith(
      "InvalidUnstake()"
    );
  });
  it("should not allow emergency unstaking duplicate token IDs", async () => {
    await nft.mint("1");
    await nft.mint("2");
    await staking.stakeNFTs(["1", "2"]);

    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // 1 day later
    await expect(staking.emergencyUnstake(["1", "1"])).to.be.revertedWith(
      "InvalidUnstake()"
    );
  });
  it("should allow querying to see if an NFT is staked by an account", async () => {
    await nft.mint("1");
    await nft.mint("2");
    expect(await staking.isStakedForAccount(a0, "1")).to.equal(false);
    await staking.stakeNFTs(["1"]);
    expect(await staking.isStakedForAccount(a0, "1")).to.equal(true);
    expect(await staking.isStakedForAccount(a0, "2")).to.equal(false);
    await staking.claimAndUnstakeNFTs(["1"]);
    expect(await staking.isStakedForAccount(a0, "1")).to.equal(false);
  });
  it("should handle random staking and unstaking", async () => {
    await nft.mint("1");
    await nft.mint("2");
    await nft.mint("3");
    await nft.mint("4");
    await nft.mint("5");

    await setAutomine(false);
    await staking.stakeNFTs(["1", "4", "5"]);
    await mineNextBlock(); // staked

    await staking.claim();
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // +1 days
    expect(await token.balanceOf(a0)).to.equal(parseUnits("3"));
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("0"));

    await staking.claimAndUnstakeNFTs(["4"]);
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // +1 days
    expect(await token.balanceOf(a0)).to.equal(parseUnits("6"));
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("0"));

    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // +1 days
    expect(await token.balanceOf(a0)).to.equal(parseUnits("6"));
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("2"));

    await staking.stakeNFTs(["3", "4"]);
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // +1 days
    expect(await token.balanceOf(a0)).to.equal(parseUnits("6"));
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("4"));

    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 10); // +10 days
    expect(await token.balanceOf(a0)).to.equal(parseUnits("6"));
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("44"));

    await staking.claim();
    await increaseTimestampAndMineNextBlock(60 * 60 * 24 * 1); // +1 days
    expect(await token.balanceOf(a0)).to.equal(parseUnits("54"));
    expect(await staking.getClaimable(a0)).to.equal(parseUnits("0"));
  });
  it("should not change cutoff timestamp if just refilling reserves", async () => {
    const cutoff = await staking.rewardUntilTimestamp();
    await token.mint(parseUnits("100"));
    await staking.depositRewards(parseUnits("100"), 0);
    expect(await staking.rewardUntilTimestamp()).to.equal(cutoff);
  });
  it("should not attempt token transfer if just updating reward timestamp", async () => {
    const cutoff = await staking.rewardUntilTimestamp();
    // would revert if token transfer attempted
    await staking.depositRewards(0, cutoff.add(1));
  });
  it("should revert of non-owner attempts to deposit rewards", async () => {
    // ensure everything else is legit
    const amount = parseUnits("100");
    await token.connect(accounts[1]).mint(amount);
    await token.connect(accounts[1]).approve(staking.address, amount);

    await expect(
      staking.connect(accounts[1]).depositRewards(amount, 0)
    ).to.be.revertedWith("caller is not the owner");
  });
});
