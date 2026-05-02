import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import type { Web3CashEscrow, MockUSDC } from '../typechain-types';

const ONE_USDC = 1_000_000n; // 6 decimals

async function signClaim(
  signer: any,
  verifyingContract: string,
  payload: {
    campaignId: string;
    recipient: string;
    amount: bigint;
    claimId: string;
    deadline: bigint;
  },
): Promise<string> {
  const { chainId } = await ethers.provider.getNetwork();
  return signer.signTypedData(
    {
      name: 'Web3CashEscrow',
      version: '1',
      chainId: Number(chainId),
      verifyingContract,
    },
    {
      Claim: [
        { name: 'campaignId', type: 'bytes32' },
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'claimId', type: 'bytes32' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    payload,
  );
}

describe('Web3CashEscrow', () => {
  let owner: any, attestor: any, funder: any, alice: any, bob: any, mallory: any;
  let usdc: MockUSDC;
  let escrow: Web3CashEscrow;
  const CAMPAIGN = ethers.keccak256(ethers.toUtf8Bytes('campaign-1'));

  beforeEach(async () => {
    [owner, attestor, funder, alice, bob, mallory] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory('MockUSDC');
    usdc = (await Mock.deploy()) as unknown as MockUSDC;
    await usdc.waitForDeployment();

    const Escrow = await ethers.getContractFactory('Web3CashEscrow');
    escrow = (await Escrow.deploy(
      await usdc.getAddress(),
      owner.address,
      attestor.address,
    )) as unknown as Web3CashEscrow;
    await escrow.waitForDeployment();

    await usdc.mint(funder.address, 10_000n * ONE_USDC);
    await usdc.connect(funder).approve(await escrow.getAddress(), 10_000n * ONE_USDC);
  });

  describe('createCampaign', () => {
    it('escrows the funder USDC', async () => {
      await escrow.connect(funder).createCampaign(CAMPAIGN, 1_000n * ONE_USDC, 0);
      expect(await usdc.balanceOf(await escrow.getAddress())).to.eq(1_000n * ONE_USDC);
      expect(await escrow.remainingOf(CAMPAIGN)).to.eq(1_000n * ONE_USDC);
    });

    it('rejects duplicate campaignId', async () => {
      await escrow.connect(funder).createCampaign(CAMPAIGN, 1_000n * ONE_USDC, 0);
      await expect(
        escrow.connect(funder).createCampaign(CAMPAIGN, 1n * ONE_USDC, 0),
      ).to.be.revertedWithCustomError(escrow, 'CampaignAlreadyExists');
    });

    it('rejects zero amount', async () => {
      await expect(
        escrow.connect(funder).createCampaign(CAMPAIGN, 0, 0),
      ).to.be.revertedWithCustomError(escrow, 'ZeroAmount');
    });
  });

  describe('claim', () => {
    const CLAIM = ethers.keccak256(ethers.toUtf8Bytes('claim-1'));

    beforeEach(async () => {
      await escrow.connect(funder).createCampaign(CAMPAIGN, 1_000n * ONE_USDC, 0);
    });

    it('pays the recipient with a valid attestor signature', async () => {
      const deadline = BigInt((await time.latest()) + 3600);
      const sig = await signClaim(attestor, await escrow.getAddress(), {
        campaignId: CAMPAIGN,
        recipient: alice.address,
        amount: 5n * ONE_USDC,
        claimId: CLAIM,
        deadline,
      });

      await expect(
        escrow.connect(bob).claim(CAMPAIGN, alice.address, 5n * ONE_USDC, CLAIM, deadline, sig),
      )
        .to.emit(escrow, 'Claimed')
        .withArgs(CAMPAIGN, alice.address, CLAIM, 5n * ONE_USDC);

      expect(await usdc.balanceOf(alice.address)).to.eq(5n * ONE_USDC);
      expect(await escrow.remainingOf(CAMPAIGN)).to.eq(995n * ONE_USDC);
    });

    it('rejects a replayed claim', async () => {
      const deadline = BigInt((await time.latest()) + 3600);
      const sig = await signClaim(attestor, await escrow.getAddress(), {
        campaignId: CAMPAIGN,
        recipient: alice.address,
        amount: 5n * ONE_USDC,
        claimId: CLAIM,
        deadline,
      });
      await escrow.claim(CAMPAIGN, alice.address, 5n * ONE_USDC, CLAIM, deadline, sig);
      await expect(
        escrow.claim(CAMPAIGN, alice.address, 5n * ONE_USDC, CLAIM, deadline, sig),
      ).to.be.revertedWithCustomError(escrow, 'AlreadyClaimed');
    });

    it('rejects an expired claim', async () => {
      const deadline = BigInt((await time.latest()) - 1);
      const sig = await signClaim(attestor, await escrow.getAddress(), {
        campaignId: CAMPAIGN,
        recipient: alice.address,
        amount: 5n * ONE_USDC,
        claimId: CLAIM,
        deadline,
      });
      await expect(
        escrow.claim(CAMPAIGN, alice.address, 5n * ONE_USDC, CLAIM, deadline, sig),
      ).to.be.revertedWithCustomError(escrow, 'ClaimExpired');
    });

    it('rejects a forged signature', async () => {
      const deadline = BigInt((await time.latest()) + 3600);
      const sig = await signClaim(mallory, await escrow.getAddress(), {
        campaignId: CAMPAIGN,
        recipient: alice.address,
        amount: 5n * ONE_USDC,
        claimId: CLAIM,
        deadline,
      });
      await expect(
        escrow.claim(CAMPAIGN, alice.address, 5n * ONE_USDC, CLAIM, deadline, sig),
      ).to.be.revertedWithCustomError(escrow, 'InvalidSignature');
    });

    it('rejects a tampered amount', async () => {
      const deadline = BigInt((await time.latest()) + 3600);
      const sig = await signClaim(attestor, await escrow.getAddress(), {
        campaignId: CAMPAIGN,
        recipient: alice.address,
        amount: 5n * ONE_USDC,
        claimId: CLAIM,
        deadline,
      });
      await expect(
        escrow.claim(CAMPAIGN, alice.address, 100n * ONE_USDC, CLAIM, deadline, sig),
      ).to.be.revertedWithCustomError(escrow, 'InvalidSignature');
    });

    it('rejects when campaign budget is exhausted', async () => {
      const deadline = BigInt((await time.latest()) + 3600);
      const sig = await signClaim(attestor, await escrow.getAddress(), {
        campaignId: CAMPAIGN,
        recipient: alice.address,
        amount: 2_000n * ONE_USDC,
        claimId: CLAIM,
        deadline,
      });
      await expect(
        escrow.claim(CAMPAIGN, alice.address, 2_000n * ONE_USDC, CLAIM, deadline, sig),
      ).to.be.revertedWithCustomError(escrow, 'InsufficientBalance');
    });
  });

  describe('withdrawRemaining', () => {
    it('refunds the funder after endsAt passes', async () => {
      const endsAt = BigInt((await time.latest()) + 3600);
      await escrow.connect(funder).createCampaign(CAMPAIGN, 100n * ONE_USDC, endsAt);
      await time.increaseTo(endsAt + 1n);

      await expect(escrow.connect(funder).withdrawRemaining(CAMPAIGN, funder.address))
        .to.emit(escrow, 'Withdrawn')
        .withArgs(CAMPAIGN, funder.address, 100n * ONE_USDC);
    });

    it('blocks withdraw while campaign is active', async () => {
      const endsAt = BigInt((await time.latest()) + 3600);
      await escrow.connect(funder).createCampaign(CAMPAIGN, 100n * ONE_USDC, endsAt);
      await expect(
        escrow.connect(funder).withdrawRemaining(CAMPAIGN, funder.address),
      ).to.be.revertedWithCustomError(escrow, 'CampaignActive');
    });

    it('only the funder can withdraw', async () => {
      await escrow.connect(funder).createCampaign(CAMPAIGN, 100n * ONE_USDC, 0);
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(mallory).withdrawRemaining(CAMPAIGN, mallory.address),
      ).to.be.revertedWithCustomError(escrow, 'NotFunder');
    });

    it('allows emergency withdraw when paused', async () => {
      await escrow.connect(funder).createCampaign(CAMPAIGN, 100n * ONE_USDC, 0);
      await escrow.connect(owner).pause();
      await expect(escrow.connect(funder).withdrawRemaining(CAMPAIGN, funder.address))
        .to.emit(escrow, 'Withdrawn')
        .withArgs(CAMPAIGN, funder.address, 100n * ONE_USDC);
    });
  });

  describe('admin', () => {
    it('rotates the attestor', async () => {
      await expect(escrow.connect(owner).setAttestor(bob.address))
        .to.emit(escrow, 'AttestorRotated')
        .withArgs(attestor.address, bob.address);
      expect(await escrow.attestor()).to.eq(bob.address);
    });

    it('non-owner cannot rotate', async () => {
      await expect(escrow.connect(mallory).setAttestor(bob.address)).to.be.reverted;
    });

    it('paused contract blocks claim', async () => {
      await escrow.connect(funder).createCampaign(CAMPAIGN, 100n * ONE_USDC, 0);
      await escrow.connect(owner).pause();
      const deadline = BigInt((await time.latest()) + 3600);
      const sig = await signClaim(attestor, await escrow.getAddress(), {
        campaignId: CAMPAIGN,
        recipient: alice.address,
        amount: 1n * ONE_USDC,
        claimId: ethers.keccak256(ethers.toUtf8Bytes('c1')),
        deadline,
      });
      await expect(
        escrow.claim(
          CAMPAIGN,
          alice.address,
          1n * ONE_USDC,
          ethers.keccak256(ethers.toUtf8Bytes('c1')),
          deadline,
          sig,
        ),
      ).to.be.reverted;
    });
  });
});
