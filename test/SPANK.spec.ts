import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SPANK } from "../typechain";
import { parseUnits } from "ethers/lib/utils";
import { expect } from "chai";

describe("SPANK.sol", () => {
  // ---
  // fixtures
  // ---

  let token: SPANK;
  let accounts: SignerWithAddress[];
  let a0: string, a1: string, a2: string, a3: string;

  beforeEach(async () => {
    const SPANK = await ethers.getContractFactory("SPANK");
    [token, accounts] = await Promise.all([
      SPANK.deploy(),
      ethers.getSigners(),
    ]);
    [a0, a1, a2, a3] = accounts.map((a) => a.address);
  });

  it("should have correct metadata", async () => {
    expect(await token.name()).to.equal("SPANK");
    expect(await token.symbol()).to.equal("SPANK");
    expect(await token.decimals()).to.equal(18);
  });
  it("should allow owner to mint", async () => {
    expect(await token.balanceOf(a0)).to.equal(0);
    await token.mint(parseUnits("100"));
    expect(await token.balanceOf(a0)).to.equal(parseUnits("100"));
  });
  it("should revert if non-owner attempts to mint", async () => {
    const token1 = token.connect(accounts[1]);
    await expect(token1.mint(parseUnits("100"))).to.be.revertedWith(
      "caller is not the owner"
    );
  });
});
