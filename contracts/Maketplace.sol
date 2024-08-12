// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Marketplace {
    struct User {
        string username;
        bool isRegistered;
        uint256[] listedItems;
        uint256[] purchasedItems;
        uint256 balance;
    }

    struct Item {
        string name;
        string description;
        uint256 price;
        bool isAvailable;
        address owner;
    }

    mapping(address => User) public users;
    mapping(uint256 => Item) public items;
    uint256 public itemCount;

    event UserRegistered(address indexed userAddress, string username);
    event ItemListed(
        uint256 indexed itemId,
        string name,
        uint256 price,
        address indexed owner
    );
    event ItemPurchased(
        uint256 indexed itemId,
        address indexed buyer,
        address indexed seller
    );
    event FundsWithdrawn(address indexed user, uint256 amount);

    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User is not registered");
        _;
    }

    function registerUser(string memory _username) public {
        require(!users[msg.sender].isRegistered, "User already registered");
        users[msg.sender] = User(
            _username,
            true,
            new uint256[](0),
            new uint256[](0),
            0
        );
        emit UserRegistered(msg.sender, _username);
    }

    function listItem(
        string memory _name,
        string memory _description,
        uint256 _price
    ) public onlyRegistered {
        itemCount++;
        items[itemCount] = Item(_name, _description, _price, true, msg.sender);
        users[msg.sender].listedItems.push(itemCount);
        emit ItemListed(itemCount, _name, _price, msg.sender);
    }

    function purchaseItem(uint256 _itemId) public payable onlyRegistered {
        Item storage item = items[_itemId];
        require(item.isAvailable, "Item is not available");
        require(msg.value >= item.price, "Insufficient funds");
        require(msg.sender != item.owner, "Owner cannot buy their own item");

        item.isAvailable = false;
        users[item.owner].balance += item.price;

        users[msg.sender].purchasedItems.push(_itemId);
        item.owner = msg.sender;

        emit ItemPurchased(_itemId, msg.sender, item.owner);
    }

    function getItemDetails(
        uint256 _itemId
    )
        public
        view
        returns (string memory, string memory, uint256, bool, address)
    {
        Item storage item = items[_itemId];
        return (
            item.name,
            item.description,
            item.price,
            item.isAvailable,
            item.owner
        );
    }

    function getUserListings(
        address _user
    ) public view returns (uint256[] memory) {
        return users[_user].listedItems;
    }

    function getUserPurchases(
        address _user
    ) public view returns (uint256[] memory) {
        return users[_user].purchasedItems;
    }

    function withdrawFunds() public onlyRegistered {
        uint256 balance = users[msg.sender].balance;
        require(balance > 0, "No funds to withdraw");
        users[msg.sender].balance = 0;
        payable(msg.sender).transfer(balance);
        emit FundsWithdrawn(msg.sender, balance);
    }
}
