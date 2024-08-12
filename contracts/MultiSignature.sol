// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract MultiSignature {
    uint256 public threshold;
    address[] public signatories;
    mapping(address => bool) public isSignatory;
    uint256 public nonce;

    struct Action {
        address to;
        uint256 value;
        bytes data;
        bool isDelegateCall;
    }

    struct Transaction {
        Action[] actions;
        bool executed;
    }

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public approvals;

    event TransactionQueued(uint256 indexed txIndex);
    event TransactionExecuted(uint256 indexed txIndex);
    event TransactionApproved(
        address indexed signatory,
        uint256 indexed txIndex
    );
    event ThresholdChanged(uint256 newThreshold);
    event SignatoryAdded(address newSignatory);
    event SignatoryRemoved(address removedSignatory);
    event ContractDeployed(address contractAddress);

    modifier onlySignatory() {
        require(isSignatory[msg.sender], "Not a signatory");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(
            !transactions[_txIndex].executed,
            "Transaction already executed"
        );
        _;
    }

    constructor(address[] memory _signatories, uint256 _threshold) {
        require(
            _signatories.length >= _threshold,
            "Threshold must be less than or equal to the number of signatories"
        );
        threshold = _threshold;
        for (uint256 i = 0; i < _signatories.length; i++) {
            address signatory = _signatories[i];
            require(signatory != address(0), "Invalid signatory");
            require(!isSignatory[signatory], "Duplicate signatory");
            isSignatory[signatory] = true;
            signatories.push(signatory);
        }
    }

    function queueTransaction(
        Action[] calldata _actions
    ) external onlySignatory {
        Transaction storage newTx = transactions.push();
        for (uint256 i = 0; i < _actions.length; i++) {
            newTx.actions.push(_actions[i]);
        }
        newTx.executed = false;

        emit TransactionQueued(transactions.length - 1);
    }

    function approveTransaction(
        uint256 _txIndex
    ) external onlySignatory txExists(_txIndex) notExecuted(_txIndex) {
        require(
            !approvals[_txIndex][msg.sender],
            "Transaction already approved"
        );

        approvals[_txIndex][msg.sender] = true;
        emit TransactionApproved(msg.sender, _txIndex);

        if (_getApprovalCount(_txIndex) >= threshold) {
            _executeTransaction(_txIndex);
        }
    }

    function _executeTransaction(
        uint256 _txIndex
    ) internal txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage txn = transactions[_txIndex];
        txn.executed = true;

        for (uint256 i = 0; i < txn.actions.length; i++) {
            Action memory action = txn.actions[i];
            if (action.to == address(0)) {
                _deployContract(action.data);
            } else {
                _executeAction(action);
            }
        }

        emit TransactionExecuted(_txIndex);
    }

    function _deployContract(bytes memory _data) internal {
        address newContract;
        bytes32 salt;
        bytes memory bytecode;

        assembly {
            salt := mload(add(_data, 0x20))
            bytecode := add(_data, 0x40)
        }

        assembly {
            newContract := create2(
                0,
                add(bytecode, 0x20),
                mload(bytecode),
                salt
            )
        }
        require(
            newContract != address(0),
            "Failed to deploy contract using CREATE2"
        );
        emit ContractDeployed(newContract);
    }

    function _executeAction(Action memory _action) internal {
        bool success;
        if (_action.isDelegateCall) {
            (success, ) = _action.to.delegatecall(_action.data);
        } else {
            (success, ) = _action.to.call{value: _action.value}(_action.data);
        }
        require(success, "Action execution failed");
    }

    function _getApprovalCount(
        uint256 _txIndex
    ) internal view returns (uint256 count) {
        for (uint256 i = 0; i < signatories.length; i++) {
            if (approvals[_txIndex][signatories[i]]) {
                count += 1;
            }
        }
    }

    function changeThreshold(uint256 _newThreshold) external {
        require(
            msg.sender == address(this),
            "Only wallet can change threshold"
        );
        require(
            _newThreshold > 0 && _newThreshold <= signatories.length,
            "Invalid threshold"
        );
        threshold = _newThreshold;
        emit ThresholdChanged(_newThreshold);
    }

    function addSignatory(address _newSignatory) external {
        require(msg.sender == address(this), "Only wallet can add signatory");
        require(_newSignatory != address(0), "Invalid signatory");
        require(!isSignatory[_newSignatory], "Already a signatory");
        isSignatory[_newSignatory] = true;
        signatories.push(_newSignatory);
        emit SignatoryAdded(_newSignatory);
    }

    function removeSignatory(address _signatory) external {
        require(
            msg.sender == address(this),
            "Only wallet can remove signatory"
        );
        require(isSignatory[_signatory], "Not a signatory");
        require(
            signatories.length > threshold,
            "Cannot remove signatory below threshold"
        );
        isSignatory[_signatory] = false;
        for (uint256 i = 0; i < signatories.length; i++) {
            if (signatories[i] == _signatory) {
                signatories[i] = signatories[signatories.length - 1];
                signatories.pop();
                break;
            }
        }
        emit SignatoryRemoved(_signatory);
    }

    receive() external payable {}
}
