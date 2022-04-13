import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseUnits } from "ethers/lib/utils";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { createMerkleTree, zero256 } from "./util";
import { MockERC20, MerkleAirdrop } from "../typechain";

const createTree = (
  entries: Array<{ recipient: string; amount: BigNumber }>
) => {
  return createMerkleTree(
    ["address", "uint256"],
    entries.map((e) => [e.recipient, e.amount])
  );
};

describe("MerkleAirdrop.sol", () => {
  // ---
  // fixtures
  // ---

  let token: MockERC20;
  let airdrop: MerkleAirdrop;
  let accounts: SignerWithAddress[];
  let a0: string, a1: string, a2: string, a3: string;

  beforeEach(async () => {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
    [token, airdrop, accounts] = await Promise.all([
      MockERC20.deploy(),
      MerkleAirdrop.deploy(),
      ethers.getSigners(),
    ]);
    [a0, a1, a2, a3] = accounts.map((a) => a.address);

    // airdrop is approved to move tokens
    await token.approve(airdrop.address, parseUnits("100000000000000000"));
  });

  const getTree = () =>
    createTree([
      {
        recipient: a0,
        amount: parseUnits("200"),
      },
      {
        recipient: a1,
        amount: parseUnits("300"),
      },
    ]);

  it("should allow basic claiming", async () => {
    const { tree, createProof } = getTree();
    await token.mint(parseUnits("500"));

    const airdrop1 = airdrop.connect(accounts[1]);

    await airdrop.setup(token.address, parseUnits("500"), tree.getHexRoot());
    await airdrop.claim(
      parseUnits("200"),
      createProof([a0, parseUnits("200")])
    );
    await airdrop1.claim(
      parseUnits("300"),
      createProof([a1, parseUnits("300")])
    );
    expect(await token.balanceOf(a0)).to.equal(parseUnits("200"));
    expect(await token.balanceOf(a1)).to.equal(parseUnits("300"));
  });
  it("should allow owner to change claim list root", async () => {
    const { tree, createProof } = getTree();
    await token.mint(parseUnits("500"));
    await airdrop.setup(token.address, parseUnits("500"), zero256);
    await airdrop.setClaimListRoot(tree.getHexRoot());
    await airdrop.claim(
      parseUnits("200"),
      createProof([a0, parseUnits("200")])
    );
    expect(await token.balanceOf(a0)).to.equal(parseUnits("200"));
  });
  it("should return total claimed amount for an account", async () => {
    const { tree, createProof } = getTree();
    await token.mint(parseUnits("500"));
    await airdrop.setup(token.address, parseUnits("500"), tree.getHexRoot());
    expect(await airdrop.totalClaimed(a0)).to.equal(0);
    await airdrop.claim(
      parseUnits("200"),
      createProof([a0, parseUnits("200")])
    );
    expect(await airdrop.totalClaimed(a0)).to.equal(parseUnits("200"));
  });
  it("should allow nop claim", async () => {
    const { tree, createProof } = getTree();
    await token.mint(parseUnits("500"));
    await airdrop.setup(token.address, parseUnits("500"), tree.getHexRoot());
    await airdrop.claim(
      parseUnits("200"),
      createProof([a0, parseUnits("200")])
    );
    // nop
    await airdrop.claim(
      parseUnits("200"),
      createProof([a0, parseUnits("200")])
    );
    expect(await airdrop.totalClaimed(a0)).to.equal(parseUnits("200"));
    expect(await token.balanceOf(a0)).to.equal(parseUnits("200"));
  });
  it("should revert if setup more than once", async () => {
    const { tree } = getTree();
    await token.mint(parseUnits("1000"));
    await airdrop.setup(token.address, parseUnits("500"), tree.getHexRoot());
    await expect(
      airdrop.setup(token.address, parseUnits("500"), tree.getHexRoot())
    ).to.be.revertedWith("AlreadySetup()");
  });
  it("should revert if invalid claim proof", async () => {
    const { tree, createProof } = getTree();
    await token.mint(parseUnits("1000"));
    await airdrop.setup(token.address, parseUnits("500"), tree.getHexRoot());

    // invalid proof
    await expect(
      airdrop.claim(parseUnits("200"), createProof([a0, parseUnits("300")]))
    ).to.be.revertedWith("InvalidClaim()");

    // invalid data
    await expect(
      airdrop.claim(parseUnits("300"), createProof([a0, parseUnits("200")]))
    ).to.be.revertedWith("InvalidClaim()");
    await expect(
      airdrop
        .connect(accounts[1])
        .claim(parseUnits("200"), createProof([a0, parseUnits("200")]))
    ).to.be.revertedWith("InvalidClaim()");
  });
  it("should revert if non-owner calls setup", async () => {
    const { tree } = getTree();
    const airdrop1 = airdrop.connect(accounts[1]);
    await expect(
      airdrop1.setup(token.address, parseUnits("500"), tree.getHexRoot())
    ).to.be.revertedWith("caller is not the owner");
  });
  it("should revert if non-owner calls setClaimRoot", async () => {
    const { tree } = getTree();
    await token.mint(parseUnits("500"));
    await airdrop.setup(token.address, parseUnits("500"), zero256);
    const airdrop1 = airdrop.connect(accounts[1]);
    await expect(
      airdrop1.setClaimListRoot(tree.getHexRoot())
    ).to.be.revertedWith("caller is not the owner");
  });
});
