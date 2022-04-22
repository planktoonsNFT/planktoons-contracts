import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockERC20, PlanktoonsMarket } from "../typechain";
import { createMerkleTree } from "./util";
import { parseUnits } from "ethers/lib/utils";
import { expect } from "chai";

describe("PlanktoonsMarket.sol", () => {
  // ---
  // fixtures
  // ---

  let token: MockERC20;
  let market: PlanktoonsMarket;
  let accounts: SignerWithAddress[];
  let a0: string, a1: string, a2: string, a3: string;

  beforeEach(async () => {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const PlanktoonsMarket = await ethers.getContractFactory(
      "PlanktoonsMarket"
    );
    [token, market, accounts] = await Promise.all([
      MockERC20.deploy(),
      PlanktoonsMarket.deploy(),
      ethers.getSigners(),
    ]);
    [a0, a1, a2, a3] = accounts.map((a) => a.address);

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
  it("should revert if setup called more than once", async () => {
    //
  });
  it("should skip airdrop claim if max claimable is zero", async () => {
    //
  });
});
