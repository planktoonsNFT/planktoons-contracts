import { utils } from "ethers";
import { MerkleTree } from "merkletreejs";

export const createMerkleTree = (types: string[], data: unknown[][]) => {
  const leaves = data.map((d) => utils.solidityKeccak256(types, d));
  const tree = new MerkleTree(leaves, utils.keccak256, { sort: true });

  const createProof = (data: unknown[]) => {
    const leaf = utils.solidityKeccak256(types, data);
    const proof = tree.getHexProof(leaf);
    return proof;
  };

  return { tree, createProof };
};

export const zero256 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
