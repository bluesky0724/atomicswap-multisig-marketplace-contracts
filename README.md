# Smart Contract Documentation

This project contains three smart contracts: AtomicSwap, Marketplace, and MultiSignature. Below is a brief description of each contract and its associated test file.

## AtomicSwap Contract

**File:** `contracts/AtomicSwap.sol`

The AtomicSwap contract facilitates trustless token swaps between two parties. It allows users to create, complete, and cancel swap agreements for ERC20 tokens.

**Key Features:**
- Create swap agreements
- Complete swaps
- Cancel expired swaps

**Test File:** `test/AtomicSwap.js`

The test file covers various scenarios including:
- Creating and completing a swap
- Handling swap expiration
- Cancelling expired swaps

## Marketplace Contract

**File:** `contracts/Marketplace.sol`

The Marketplace contract implements a decentralized marketplace where users can register, list items for sale, purchase items, and manage their funds.

**Key Features:**
- User registration
- Item listing and purchasing
- Fund management (withdrawals)

**Test File:** `test/Marketplace.js`

The test file covers:
- User registration
- Item listing and purchasing
- Fund withdrawal
- Various edge cases and error conditions

## MultiSignature Contract

**File:** `contracts/MultiSignature.sol`

The MultiSignature contract implements a multi-signature wallet that requires a threshold of approvals to execute transactions. It supports various wallet management functions and contract deployment.

**Key Features:**
- Transaction queueing and approval
- Changing approval threshold
- Adding/removing signatories
- Contract deployment via CREATE2

**Test File:** `test/MultiSignature.js`

The test file covers:
- Wallet deployment and initial setup
- Transaction management (queueing, approval, execution)
- Wallet management (changing threshold, adding/removing signatories)
- Contract deployment via the multi-sig wallet

Each test file provides comprehensive coverage of the respective contract's functionality, ensuring robustness and correctness of the implemented features.
