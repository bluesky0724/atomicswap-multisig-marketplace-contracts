# Smart Contract Documentation

This project contains three smart contracts: AtomicSwap, Marketplace, and MultiSignature. Below is a brief description of each contract, its associated test file, and key features to test.

## Tech Stack

- Solidity: Smart contract development
- Hardhat: Ethereum development environment
- Ethers.js: Ethereum library for interacting with smart contracts
- Chai: Testing framework

## Getting Started

1. Install dependencies:
   
   npm install
   

2. Compile contracts:
   
   npx hardhat compile
   

3. Run tests:
   
   npx hardhat test
   

4. Deploy contracts (replace `<network>` with your target network):
   
   npx hardhat run scripts/deploy.js --network <network>
   

## AtomicSwap Contract

**File:** `contracts/AtomicSwap.sol`

The AtomicSwap contract facilitates trustless token swaps between two parties. It allows users to create, complete, and cancel swap agreements for ERC20 tokens.

**Key Features to Test:**
- Creating swap agreements
- Completing swaps successfully
- Cancelling expired swaps
- Handling invalid swap parameters
- Verifying token transfers during swaps

**Test File:** `test/AtomicSwap.js`

## Marketplace Contract

**File:** `contracts/Marketplace.sol`

The Marketplace contract implements a decentralized marketplace where users can register, list items for sale, purchase items, and manage their funds.

**Key Features to Test:**
- User registration process
- Listing items for sale with various parameters
- Purchasing items and verifying fund transfers
- Withdrawing funds from the marketplace
- Handling edge cases like insufficient funds or invalid item IDs

**Test File:** `test/Marketplace.js`

## MultiSignature Contract

**File:** `contracts/MultiSignature.sol`

The MultiSignature contract implements a multi-signature wallet that requires a threshold of approvals to execute transactions. It supports various wallet management functions and contract deployment.

**Key Features to Test:**
- Wallet deployment and initial setup
- Queueing transactions and verifying approval process
- Executing transactions after reaching approval threshold
- Changing approval threshold and verifying effects
- Adding and removing signatories
- Deploying contracts via CREATE2 using the multi-sig wallet
- Handling edge cases like insufficient approvals or invalid signatures

**Test File:** `test/MultiSignature.js`

Each test file provides comprehensive coverage of the respective contract's functionality, ensuring robustness and correctness of the implemented features.
