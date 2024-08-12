const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AtomicSwap", function () {
  let tokenX, tokenY, atomicSwap;
  let owner, alice, bob;
  let swapID;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    // Deploy ERC20 tokens
    const ERC20 = await ethers.getContractFactory("MockERC20");
    tokenX = await ERC20.deploy(
      "TokenX",
      "TKX",
      ethers.utils.parseEther("1000")
    );
    tokenY = await ERC20.deploy(
      "TokenY",
      "TKY",
      ethers.utils.parseEther("1000")
    );

    await tokenX.deployed();
    await tokenY.deployed();

    // Deploy AtomicSwap contract
    const AtomicSwap = await ethers.getContractFactory("AtomicSwap");
    atomicSwap = await AtomicSwap.deploy();
    await atomicSwap.deployed();

    // Transfer some tokens to Alice and Bob
    await tokenX.transfer(alice.address, ethers.utils.parseEther("100"));
    await tokenY.transfer(bob.address, ethers.utils.parseEther("100"));
  });

  it("should create and complete a swap", async function () {
    const amountX = ethers.utils.parseEther("10");
    const amountY = ethers.utils.parseEther("20");
    const blockNumBefore = await ethers.provider.getBlockNumber()
    const timestmap = (await ethers.provider.getBlock(blockNumBefore))
        .timestamp
    const expiration = timestmap + 3600; // 1 hour from now

    // Approve tokens for transfer
    await tokenX.connect(alice).approve(atomicSwap.address, amountX);
    await tokenY.connect(bob).approve(atomicSwap.address, amountY);

    // Create a swap
    const tx = await atomicSwap
      .connect(alice)
      .createSwap(
        bob.address,
        tokenX.address,
        tokenY.address,
        amountX,
        amountY,
        expiration
      );

    const receipt = await tx.wait();
    swapID = receipt.events[0].args.swapID;

    // Check the swap details
    const swap = await atomicSwap.swaps(swapID);
    expect(swap.initiator).to.equal(alice.address);
    expect(swap.counterparty).to.equal(bob.address);
    expect(swap.tokenX).to.equal(tokenX.address);
    expect(swap.tokenY).to.equal(tokenY.address);
    expect(swap.amountX).to.equal(amountX);
    expect(swap.amountY).to.equal(amountY);
    expect(swap.expiration).to.equal(expiration);

    // Complete the swap
    await atomicSwap.connect(bob).completeSwap(swapID);

    // Check balances after swap
    const aliceBalanceX = await tokenX.balanceOf(alice.address);
    const aliceBalanceY = await tokenY.balanceOf(alice.address);
    const bobBalanceX = await tokenX.balanceOf(bob.address);
    const bobBalanceY = await tokenY.balanceOf(bob.address);

    expect(aliceBalanceX).to.equal(ethers.utils.parseEther("90"));
    expect(aliceBalanceY).to.equal(ethers.utils.parseEther("20"));
    expect(bobBalanceX).to.equal(ethers.utils.parseEther("10"));
    expect(bobBalanceY).to.equal(ethers.utils.parseEther("80"));
  });

  it("should not allow swap completion after expiration", async function () {
    const amountX = ethers.utils.parseEther("10");
    const amountY = ethers.utils.parseEther("20");
    const blockNumBefore = await ethers.provider.getBlockNumber()
    const timestmap = (await ethers.provider.getBlock(blockNumBefore))
        .timestamp
    const expiration = timestmap + 3600; 

    // Approve tokens for transfer
    await tokenX.connect(alice).approve(atomicSwap.address, amountX);
    await tokenY.connect(bob).approve(atomicSwap.address, amountY);

    // Create a swap
    const tx = await atomicSwap
      .connect(alice)
      .createSwap(
        bob.address,
        tokenX.address,
        tokenY.address,
        amountX,
        amountY,
        expiration
      );

    const receipt = await tx.wait();
    swapID = receipt.events[0].args.swapID;

    await network.provider.send("evm_increaseTime", [5000]);
    await network.provider.send("evm_mine");

    // Attempt to complete the swap
    await expect(
      atomicSwap.connect(bob).completeSwap(swapID)
    ).to.be.revertedWith("Swap has expired");
  });

  it("should allow the initiator to cancel an expired swap", async function () {
    const amountX = ethers.utils.parseEther("10");
    const amountY = ethers.utils.parseEther("20");
    const blockNumBefore = await ethers.provider.getBlockNumber()
    const timestmap = (await ethers.provider.getBlock(blockNumBefore))
        .timestamp
    const expiration = timestmap + 3600; 

    // Approve tokens for transfer
    await tokenX.connect(alice).approve(atomicSwap.address, amountX);
    await tokenY.connect(bob).approve(atomicSwap.address, amountY);

    // Create a swap
    const tx = await atomicSwap
      .connect(alice)
      .createSwap(
        bob.address,
        tokenX.address,
        tokenY.address,
        amountX,
        amountY,
        expiration
      );

    const receipt = await tx.wait();
    swapID = receipt.events[0].args.swapID;

    await network.provider.send("evm_increaseTime", [5000]);
    await network.provider.send("evm_mine");

    // Cancel the swap
    await atomicSwap.connect(alice).cancelSwap(swapID);

    const swap = await atomicSwap.swaps(swapID);
    expect(swap.completed).to.be.true;
  });
});
