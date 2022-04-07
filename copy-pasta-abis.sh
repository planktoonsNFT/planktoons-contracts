#!/bin/bash

# script to copy ABIs from this repo to sibling repos (subgraph and frontend)

BASE=./artifacts/contracts
GRAPH=../planktoons-subgraph/abis
FRONTEND=../planktoons-frontend/core/abis

yarn build \
  && cp \
    $BASE/existing/Planktoons.sol/Planktoons.json \
    $BASE/NFTStaking.sol/NFTStaking.json \
      $GRAPH \
  && cp \
    $BASE/existing/Planktoons.sol/Planktoons.json \
    $BASE/NFTStaking.sol/NFTStaking.json \
    $BASE/SPANK.sol/SPANK.json \
      $FRONTEND
