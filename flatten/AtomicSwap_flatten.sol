// Sources flattened with hardhat v2.22.8 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.0.2

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// File contracts/AtomicSwap.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.0;
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
