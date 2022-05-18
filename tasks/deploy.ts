import { task } from "hardhat/config";
import { readDeploymentsFile, writeDeploymentsFile } from "./file";

task("deploy", "Deploy a contract")
  .addParam<string>("contract", "Contract to deploy")
  .setAction(async ({ contract }, { ethers, run, network }) => {
    console.log("compiling all contracts ...");
    await run("compile");

    const ContractFactory: any = await ethers.getContractFactory(contract);

    console.log(`Deploying ${contract} ...`);

    const constructorArguments: unknown[] = [];
    if (contract === "PlanktoonsBalance") {
      const entries = await readDeploymentsFile();
      const nft = entries[network.name]?.Planktoons;
      const staking = entries[network.name]?.PlanktoonsStaking;
      constructorArguments.push(nft, staking);
    } else if (contract === "PlanktoonsMarket") {
      const entries = await readDeploymentsFile();
      const nft = entries[network.name]?.Planktoons;
      const staking = entries[network.name]?.PlanktoonsStaking;
      const airdrop = entries[network.name]?.PlanktoonsAirdrop;
      constructorArguments.push(nft, staking, airdrop);
    }

    const deployed = await ContractFactory.deploy(...constructorArguments);
    await deployed.deployed();
    const address = deployed.address;

    console.log("\n\n---");
    console.log(`🚀 ${contract}: ${address}`);
    if (constructorArguments.length > 0) {
      console.log(`\nconstructor args: ${constructorArguments.join(" ")}`);
    }
    console.log("---\n\n");

    if (network.name !== "localhost" && network.name !== "hardhat") {
      console.log("updating factory-deployments.json ...");
      const entries = await readDeploymentsFile();
      const entry = entries[network.name] ?? {};
      entries[network.name] = { ...entry, [contract]: address };
      await writeDeploymentsFile(entries);

      console.log("waiting 60 seconds before attempting to verify ...");
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

      console.log("verifying...");
      try {
        await run("verify:verify", {
          address: deployed.address,
          constructorArguments,
        });
      } catch (err) {
        console.warn("Verfication error:", err);
      }
    }

    return address;
  });
