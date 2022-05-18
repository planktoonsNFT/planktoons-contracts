import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  MerkleAirdrop,
  MockERC20,
  MockERC721,
  NFTStaking,
  PlanktoonsMarket,
} from "../typechain";
import { createMerkleTree } from "./util";
import { parseUnits } from "ethers/lib/utils";
import { expect } from "chai";

describe("PlanktoonsMarket.sol", () => {
  // ---
  // fixtures
  // ---

  let token: MockERC20;
  let nft: MockERC721;
  let staking: NFTStaking;
  let airdrop: MerkleAirdrop;
  let market: PlanktoonsMarket;
  let accounts: SignerWithAddress[];
  let a0: string, a1: string, a2: string, a3: string;

  beforeEach(async () => {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    const NFTStaking = await ethers.getContractFactory("NFTStaking");
    const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
    const PlanktoonsMarket = await ethers.getContractFactory(
      "PlanktoonsMarket"
    );
    [token, nft, staking, airdrop, accounts] = await Promise.all([
      MockERC20.deploy(),
      MockERC721.deploy(),
      NFTStaking.deploy(),
      MerkleAirdrop.deploy(),
      ethers.getSigners(),
    ]);
    [a0, a1, a2, a3] = accounts.map((a) => a.address);

    const market = await PlanktoonsMarket.deploy(
      nft.address,
      staking.address,
      airdrop.address
    );

    // market is approved to spend mock token for a0
    await token.approve(market.address, parseUnits("100000000000000000"));
  });

  const getTree = () =>
    createMerkleTree(
      ["string", "address", "uint256", "uint256"],
      [
        ["foo", token.address, parseUnits("10"), 100],
        ["bar", token.address, parseUnits("20"), 50],
      ]
    );

  it("should allow basic claim and purchase", async () => {
    //
  });
  it("should skip airdrop claim if max claimable is zero", async () => {
    //
  });
  it("should revert if no staked or owned nfts when purchasing", async () => {
    //
  });
  it("should revert if no staked or owned nfts when purchasing + claiming", async () => {
    //
  });
});
