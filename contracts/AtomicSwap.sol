// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AtomicSwap {

    struct Swap {
        address initiator;
        address counterparty;
        address tokenX;
        address tokenY;
        uint256 amountX;
        uint256 amountY;
        uint256 expiration;
        bool completed;
    }

    mapping(bytes32 => Swap) public swaps;

    event SwapCreated(bytes32 indexed swapID, address indexed initiator, address indexed counterparty, address tokenX, address tokenY, uint256 amountX, uint256 amountY, uint256 expiration);
    event SwapCompleted(bytes32 indexed swapID);
    event SwapCancelled(bytes32 indexed swapID);

    modifier onlyInitiator(bytes32 _swapID) {
        require(msg.sender == swaps[_swapID].initiator, "Not the initiator");
        _;
    }

    modifier swapExists(bytes32 _swapID) {
        require(swaps[_swapID].initiator != address(0), "Swap does not exist");
        _;
    }

    modifier notCompleted(bytes32 _swapID) {
        require(!swaps[_swapID].completed, "Swap already completed");
        _;
    }

    function createSwap(
        address _counterparty,
        address _tokenX,
        address _tokenY,
        uint256 _amountX,
        uint256 _amountY,
        uint256 _expiration
    ) external returns (bytes32 swapID) {
        require(_expiration > block.timestamp, "Expiration must be in the future");
        swapID = keccak256(abi.encodePacked(msg.sender, _counterparty, _tokenX, _tokenY, _amountX, _amountY, block.timestamp));
        
        swaps[swapID] = Swap({
            initiator: msg.sender,
            counterparty: _counterparty,
            tokenX: _tokenX,
            tokenY: _tokenY,
            amountX: _amountX,
            amountY: _amountY,
            expiration: _expiration,
            completed: false
        });

        emit SwapCreated(swapID, msg.sender, _counterparty, _tokenX, _tokenY, _amountX, _amountY, _expiration);
    }

    function completeSwap(bytes32 _swapID) external swapExists(_swapID) notCompleted(_swapID) {
        Swap storage _swap = swaps[_swapID];
        require(msg.sender == _swap.counterparty, "Only the counterparty can complete the swap");
        require(block.timestamp <= _swap.expiration, "Swap has expired");

        // Transfer tokens
        require(IERC20(_swap.tokenX).transferFrom(_swap.initiator, _swap.counterparty, _swap.amountX), "TokenX transfer failed");
        require(IERC20(_swap.tokenY).transferFrom(_swap.counterparty, _swap.initiator, _swap.amountY), "TokenY transfer failed");

        _swap.completed = true;

        emit SwapCompleted(_swapID);
    }

    function cancelSwap(bytes32 _swapID) external swapExists(_swapID) onlyInitiator(_swapID) notCompleted(_swapID) {
        require(block.timestamp > swaps[_swapID].expiration, "Swap not expired yet");

        swaps[_swapID].completed = true;

        emit SwapCancelled(_swapID);
    }
}
