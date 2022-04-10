import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockERC721, MockERC20, NFTStaking, MerkleMarket } from "../typechain";
import { parseUnits } from "ethers/lib/utils";
import { expect } from "chai";

describe("MerkleMarket.sol", () => {
  // ---
  // fixtures
  // ---

  let token: MockERC20;
  let market: MerkleMarket;
  let accounts: SignerWithAddress[];
  let a0: string, a1: string, a2: string, a3: string;

  beforeEach(async () => {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MerkleMarket = await ethers.getContractFactory("MerkleMarket");
    [token, market, accounts] = await Promise.all([
      MockERC20.deploy(),
      MerkleMarket.deploy(),
      ethers.getSigners(),
    ]);
    [a0, a1, a2, a3] = accounts.map((a) => a.address);

    // market is approved to spend mock token for a0
    await token.approve(market.address, parseUnits("100000000000000000"));
  });

  it("should allow basic purchasing", async () => {
    await token.mint(parseUnits("100"));
    expect(await market.getTotalPurchased("foo")).to.equal(0);
    await market.purchase([
      {
        itemId: "foo",
        amount: 2,
        unitPrice: parseUnits("10"),
        maxAmount: 10,
        proof: [],
        token: token.address,
      },
    ]);
    expect(await token.balanceOf(a0)).to.equal(parseUnits("80"));
    expect(await market.getTotalPurchased("foo")).to.equal(2);
  });
  it("should allow allow owner to withdraw tokens", async () => {
    //
  });
  it("should allow allow owner to set inventory root", async () => {
    //
  });
  it("should revert if insufficient remaining inventory", async () => {
    //
  });
  it("should revert if order has invalid proof", async () => {
    //
  });
  it("should revert if non owner attempts to set inventory root", async () => {
    //
  });
  it("should revert if non owner attempts to withdraw", async () => {
    //
  });
});
