# bitdiamond-sc

List of smart contracts for BitDiamond

# For Testnet

- Open remix online compiler [Remix](https://remix.ethereum.org/#optimize=false&runs=200&evmVersion=null&version=soljson-v0.8.1+commit.df193b15.js)

- In the file explorer, on the left-hand side, `contracts` -> right click -> `New File` -> `StakeBitDiamond.sol` -> Paste `/flattened_contracts/StakeBitDiamond.sol` -> `Ctrl+s`

- Compile the contracts (`Blue Button`)

- From the left-panel, click `Deploy & run transactions`

- For StakeBitDiamond.sol -> Deploy

# For Mainnet

- We can follow above steps or we can also add scripts in the package json for mainnet deployment

# Flattening contracts

Execute from the root of the project:

`truffle-flattener contracts/StakeBitDiamond.sol --output flattened_contracts/StakeBitDiamond.sol`
