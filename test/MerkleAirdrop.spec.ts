import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockERC20, MerkleAirdrop } from "../typechain";
import { parseUnits } from "ethers/lib/utils";
import { expect } from "chai";

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

  it("should allow basic claiming", async () => {
    await token.mint(parseUnits("1000"));
    await airdrop.setup(
      token.address,
      parseUnits("1000"),
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    await airdrop.claim(parseUnits("100"), []);
    expect(await token.balanceOf(a0)).to.equal(parseUnits("100"));
  });
});
