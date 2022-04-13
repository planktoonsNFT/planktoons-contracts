import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockERC20, MerkleMarket } from "../typechain";
import { createMerkleTree, zero256 } from "./util";
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

  const getTree = () =>
    createMerkleTree(
      ["string", "address", "uint256", "uint256"],
      [
        ["foo", token.address, parseUnits("10"), 100],
        ["bar", token.address, parseUnits("20"), 50],
      ]
    );

  it("should allow basic purchasing", async () => {
    const { tree, createProofForIndex } = getTree();
    await token.mint(parseUnits("100"));
    await market.setInventoryRoot(tree.getHexRoot());
    expect(await market.getTotalPurchased("foo")).to.equal(0);
    await market.purchase([
      {
        itemId: "foo",
        amount: 2,
        unitPrice: parseUnits("10"),
        maxAmount: 100,
        proof: createProofForIndex(0),
        token: token.address,
        memo: "hey",
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
    const { tree, createProofForIndex } = getTree();
    await token.mint(parseUnits("100"));
    await market.setInventoryRoot(tree.getHexRoot());
    expect(await market.getTotalPurchased("foo")).to.equal(0);
    await expect(
      market.purchase([
        {
          itemId: "foo",
          amount: 2,
          unitPrice: parseUnits("10"),
          maxAmount: 10,
          proof: createProofForIndex(0),
          token: token.address,
          memo: "hey",
        },
      ])
    ).to.be.revertedWith("InvalidItem()");
  });
  it("should revert if non owner attempts to set inventory root", async () => {
    //
  });
  it("should revert if non owner attempts to withdraw", async () => {
    //
  });
});
