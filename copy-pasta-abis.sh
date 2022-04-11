#!/bin/bash

# script to copy ABIs from this repo to sibling repos (subgraph and frontend)

BASE=./artifacts/contracts
OZ_BASE=./artifacts/@openzeppelin/contracts
GRAPH=../planktoons-subgraph/abis
FRONTEND=../planktoons-frontend/core/abis

yarn build \
  && cp \
    $OZ_BASE/token/ERC20/IERC20.sol/IERC20.json \
    $OZ_BASE/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json \
    $OZ_BASE/token/ERC721/IERC721.sol/IERC721.json \
    $BASE/NFTStaking.sol/NFTStaking.json \
    $BASE/MerkleMarket.sol/MerkleMarket.json \
      $GRAPH \
  && cp \
    $OZ_BASE/token/ERC20/IERC20.sol/IERC20.json \
    $OZ_BASE/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json \
    $OZ_BASE/token/ERC721/IERC721.sol/IERC721.json \
    $BASE/NFTStaking.sol/NFTStaking.json \
    $BASE/MerkleMarket.sol/MerkleMarket.json \
      $FRONTEND
