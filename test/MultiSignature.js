const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSignature", function () {
    let MultiSignature;
    let multiSig;
    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addrs;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
        MultiSignature = await ethers.getContractFactory("MultiSignature");
        multiSig = await MultiSignature.deploy(
            [owner.address, addr1.address, addr2.address],
            2
        );
        await multiSig.deployed();
    });

    describe("Deployment", function () {
        it("Should set the correct threshold", async function () {
            expect(await multiSig.threshold()).to.equal(2);
        });

        it("Should set the correct signatories", async function () {
            expect(await multiSig.isSignatory(owner.address)).to.be.true;
            expect(await multiSig.isSignatory(addr1.address)).to.be.true;
            expect(await multiSig.isSignatory(addr2.address)).to.be.true;
            expect(await multiSig.isSignatory(addr3.address)).to.be.false;
        });
    });

    describe("Transaction Management", function () {
        it("Should queue a transaction", async function () {
            const action = {
                to: addr3.address,
                value: ethers.utils.parseEther("1"),
                data: "0x",
                isDelegateCall: false,
            };

            await expect(multiSig.connect(owner).queueTransaction([action]))
                .to.emit(multiSig, "TransactionQueued")
                .withArgs(0);
        });

        it("Should approve a transaction", async function () {
            const action = {
                to: addr3.address,
                value: ethers.utils.parseEther("1"),
                data: "0x",
                isDelegateCall: false,
            };

            await multiSig.connect(owner).queueTransaction([action]);

            await expect(multiSig.connect(owner).approveTransaction(0))
                .to.emit(multiSig, "TransactionApproved")
                .withArgs(owner.address, 0);
        });

        it("Should execute a transaction when threshold is met", async function () {
            await owner.sendTransaction({
                to: multiSig.address,
                value: ethers.utils.parseEther("5"), // Send 5 ETH, adjust as needed
            });

            const action = {
                to: addr3.address,
                value: ethers.utils.parseEther("1"),
                data: "0x",
                isDelegateCall: false,
            };
            await multiSig.connect(owner).queueTransaction([action]);
            await multiSig.connect(owner).approveTransaction(0);

            await expect(multiSig.connect(addr1).approveTransaction(0))
                .to.emit(multiSig, "TransactionExecuted")
                .withArgs(0);
        });
    });

    describe("Wallet Management", function () {
        it("Should change threshold", async function () {
            const changeThresholdAction = {
                to: multiSig.address,
                value: 0,
                data: multiSig.interface.encodeFunctionData("changeThreshold", [
                    3,
                ]),
                isDelegateCall: false,
            };

            await multiSig
                .connect(owner)
                .queueTransaction([changeThresholdAction]);
            await multiSig.connect(owner).approveTransaction(0);
            await multiSig.connect(addr1).approveTransaction(0);

            expect(await multiSig.threshold()).to.equal(3);
        });

        it("Should add a new signatory", async function () {
            const addSignatoryAction = {
                to: multiSig.address,
                value: 0,
                data: multiSig.interface.encodeFunctionData("addSignatory", [
                    addr3.address,
                ]),
                isDelegateCall: false,
            };

            await multiSig
                .connect(owner)
                .queueTransaction([addSignatoryAction]);
            await multiSig.connect(owner).approveTransaction(0);
            await multiSig.connect(addr1).approveTransaction(0);

            expect(await multiSig.isSignatory(addr3.address)).to.be.true;
        });

        it("Should remove a signatory", async function () {
            const removeSignatoryAction = {
                to: multiSig.address,
                value: 0,
                data: multiSig.interface.encodeFunctionData("removeSignatory", [
                    addr2.address,
                ]),
                isDelegateCall: false,
            };

            await multiSig
                .connect(owner)
                .queueTransaction([removeSignatoryAction]);
            await multiSig.connect(owner).approveTransaction(0);
            await multiSig.connect(addr1).approveTransaction(0);

            expect(await multiSig.isSignatory(addr2.address)).to.be.false;
        });
    });

    describe("Contract Deployment", function () {
        it("Should deploy a new contract", async function () {
            const DummyContract = await ethers.getContractFactory("MockERC20");
            const salt = ethers.utils.randomBytes(32);
            const deployData = ethers.utils.defaultAbiCoder.encode(
                ["bytes32", "bytes"],
                [salt, DummyContract.bytecode]
            );

            const deployAction = {
                to: ethers.constants.AddressZero,
                value: 0,
                data: deployData,
                isDelegateCall: false,
            };

            await multiSig.connect(owner).queueTransaction([deployAction]);

            await expect(multiSig.connect(owner).approveTransaction(0))
                .to.emit(multiSig, "TransactionApproved")
                .withArgs(owner.address, 0);

            await expect(multiSig.connect(addr1).approveTransaction(0)).to.emit(
                multiSig,
                "ContractDeployed"
            );
        });
    });
});
