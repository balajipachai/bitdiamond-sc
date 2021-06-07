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

# Running tests

1. Launch ganache-cli by forking the binance smart chain as BTDMD is deployed on the Mainnet

`ganache-cli -a 10 -m "modify exotic job rubber mask park ten gown puzzle diagram useful loud" -f "https://bsc-dataseed.binance.org/" --unlock 0xd34355e34f48580155a22557332b031421742d14 --networkId 5777`

2. Run the tests

`truffle --network development test`
