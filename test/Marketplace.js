const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
    let Marketplace;
    let marketplace;
    let owner;
    let addr1;
    let addr2;
    let addr3;

    beforeEach(async function () {
        Marketplace = await ethers.getContractFactory("Marketplace");
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        marketplace = await Marketplace.deploy();
        await marketplace.deployed();
    });

    describe("User Registration", function () {
        it("Should register a new user", async function () {
            await marketplace.connect(addr1).registerUser("user1");
            const user = await marketplace.users(addr1.address);
            expect(user.username).to.equal("user1");
            expect(user.isRegistered).to.be.true;
        });

        it("Should emit UserRegistered event", async function () {
            await expect(marketplace.connect(addr1).registerUser("user1"))
                .to.emit(marketplace, "UserRegistered")
                .withArgs(addr1.address, "user1");
        });

        it("Should revert if user is already registered", async function () {
            await marketplace.connect(addr1).registerUser("user1");
            await expect(
                marketplace.connect(addr1).registerUser("user1")
            ).to.be.revertedWith("User already registered");
        });
    });

    describe("List Item", function () {
        beforeEach(async function () {
            await marketplace.connect(addr1).registerUser("user1");
        });

        it("Should list a new item", async function () {
            await marketplace
                .connect(addr1)
                .listItem(
                    "Item1",
                    "Description1",
                    ethers.utils.parseEther("1")
                );
            const item = await marketplace.items(1);
            expect(item.name).to.equal("Item1");
            expect(item.description).to.equal("Description1");
            expect(item.price).to.equal(ethers.utils.parseEther("1"));
            expect(item.isAvailable).to.be.true;
            expect(item.owner).to.equal(addr1.address);
        });

        it("Should emit ItemListed event", async function () {
            await expect(
                marketplace
                    .connect(addr1)
                    .listItem(
                        "Item1",
                        "Description1",
                        ethers.utils.parseEther("1")
                    )
            )
                .to.emit(marketplace, "ItemListed")
                .withArgs(
                    1,
                    "Item1",
                    ethers.utils.parseEther("1"),
                    addr1.address
                );
        });

        it("Should revert if user is not registered", async function () {
            await expect(
                marketplace
                    .connect(addr2)
                    .listItem(
                        "Item1",
                        "Description1",
                        ethers.utils.parseEther("1")
                    )
            ).to.be.revertedWith("User is not registered");
        });
    });

    describe("Purchase Item", function () {
        beforeEach(async function () {
            await marketplace.connect(addr1).registerUser("user1");
            await marketplace.connect(addr2).registerUser("user2");
            await marketplace
                .connect(addr1)
                .listItem(
                    "Item1",
                    "Description1",
                    ethers.utils.parseEther("1")
                );
        });

        it("Should purchase an item", async function () {
            await marketplace
                .connect(addr2)
                .purchaseItem(1, { value: ethers.utils.parseEther("1") });
            const item = await marketplace.items(1);
            expect(item.isAvailable).to.be.false;
            expect(item.owner).to.equal(addr2.address);
        });

        it("Should emit ItemPurchased event", async function () {
            await expect(
                marketplace
                    .connect(addr2)
                    .purchaseItem(1, { value: ethers.utils.parseEther("1") })
            ).to.emit(marketplace, "ItemPurchased");
            // .withArgs(0, addr2.address, addr1.address);
        });

        it("Should revert if item is not available", async function () {
            await marketplace.connect(addr3).registerUser("user3");
            await marketplace
                .connect(addr2)
                .purchaseItem(1, { value: ethers.utils.parseEther("1") });
            await expect(
                marketplace
                    .connect(addr3)
                    .purchaseItem(1, { value: ethers.utils.parseEther("1") })
            ).to.be.revertedWith("Item is not available");
        });

        it("Should revert if insufficient funds", async function () {
            await expect(
                marketplace
                    .connect(addr2)
                    .purchaseItem(1, { value: ethers.utils.parseEther("0.5") })
            ).to.be.revertedWith("Insufficient funds");
        });

        it("Should revert if owner tries to buy their own item", async function () {
            await expect(
                marketplace
                    .connect(addr1)
                    .purchaseItem(1, { value: ethers.utils.parseEther("1") })
            ).to.be.revertedWith("Owner cannot buy their own item");
        });
    });

    describe("Withdraw Funds", function () {
        beforeEach(async function () {
            await marketplace.connect(addr1).registerUser("user1");
            await marketplace.connect(addr2).registerUser("user2");
            await marketplace
                .connect(addr1)
                .listItem(
                    "Item1",
                    "Description1",
                    ethers.utils.parseEther("1")
                );
            await marketplace
                .connect(addr2)
                .purchaseItem(1, { value: ethers.utils.parseEther("1") });
        });

        it("Should withdraw funds", async function () {
            const initialBalance = await ethers.provider.getBalance(
                addr1.address
            );
            await marketplace.connect(addr1).withdrawFunds();
            const finalBalance = await ethers.provider.getBalance(
                addr1.address
            );
            expect(finalBalance.sub(initialBalance)).to.be.closeTo(
                ethers.utils.parseEther("1"),
                ethers.utils.parseEther("0.01")
            );
        });

        it("Should emit FundsWithdrawn event", async function () {
            await expect(marketplace.connect(addr1).withdrawFunds())
                .to.emit(marketplace, "FundsWithdrawn")
                .withArgs(addr1.address, ethers.utils.parseEther("1"));
        });

        it("Should revert if no funds to withdraw", async function () {
            await marketplace.connect(addr1).withdrawFunds();
            await expect(
                marketplace.connect(addr1).withdrawFunds()
            ).to.be.revertedWith("No funds to withdraw");
        });
    });

    describe("Get Item Details", function () {
        beforeEach(async function () {
            await marketplace.connect(addr1).registerUser("user1");
            await marketplace
                .connect(addr1)
                .listItem(
                    "Item1",
                    "Description1",
                    ethers.utils.parseEther("1")
                );
        });

        it("Should return correct item details", async function () {
            const [name, description, price, isAvailable, owner] =
                await marketplace.getItemDetails(1);
            expect(name).to.equal("Item1");
            expect(description).to.equal("Description1");
            expect(price).to.equal(ethers.utils.parseEther("1"));
            expect(isAvailable).to.be.true;
            expect(owner).to.equal(addr1.address);
        });
    });

    describe("Get User Listings and Purchases", function () {
        beforeEach(async function () {
            await marketplace.connect(addr1).registerUser("user1");
            await marketplace.connect(addr2).registerUser("user2");
            await marketplace
                .connect(addr1)
                .listItem(
                    "Item1",
                    "Description1",
                    ethers.utils.parseEther("1")
                );
            await marketplace
                .connect(addr2)
                .purchaseItem(1, { value: ethers.utils.parseEther("1") });
        });

        it("Should return correct user listings", async function () {
            const listings = await marketplace.getUserListings(addr1.address);
            expect(listings.length).to.equal(1);
            expect(listings[0]).to.equal(1);
        });

        it("Should return correct user purchases", async function () {
            const purchases = await marketplace.getUserPurchases(addr2.address);
            expect(purchases.length).to.equal(1);
            expect(purchases[0]).to.equal(1);
        });
    });
});
