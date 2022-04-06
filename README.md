# planktoons-contracts

Smart contracts for Planktoons

## Development

Install dependencies:

```
yarn
```

Compile all artifacts and generate typechain types:

```
yarn build
```

Run unit tests:

```
yarn test
```

Run unit tests showing gas usage by function and deploy costs:

```
REPORT_GAS=1 yarn test
```

Run unit tests and report coverage:

```
yarn test:coverage
```

If you have `planktoons-subgraph` and `planktoons-frontend` repos as sibling directories to this one, you can copy built ABIs to the appropriate location in those repos:

```
./copy-pasta-abis.sh
```

## Deployment

Copy `.env.example` to `.env` and override the default values before deploying.

Deploy a contract (eg, PlanktoonsStaking):

```
yarn deploy --network rinkeby --contract PlanktoonsStaking
```

This will output the deployed contract address in the console and update the `./tasks/deployments.json` file.

> NOTE: The contract will automatically be verified on etherscan

### Verification

The `deploy` task will automatically verify contracts generally.

This can occasionally fail. If it does, verify manually:

```
yarn verify --network rinkeby $CONTRACT_ADDRESS
```

Verification may fail if run too quickly after contract deployment.
