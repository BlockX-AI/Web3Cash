import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import type { Web3CashRegistry } from '../typechain-types';

const TWITTER = ethers.keccak256(ethers.toUtf8Bytes('TWITTER'));
const DISCORD = ethers.keccak256(ethers.toUtf8Bytes('DISCORD'));

async function signBind(
  signer: any,
  verifyingContract: string,
  payload: {
    wallet: string;
    platform: string;
    handleHash: string;
    nonce: bigint;
    deadline: bigint;
  },
): Promise<string> {
  const { chainId } = await ethers.provider.getNetwork();
  return signer.signTypedData(
    {
      name: 'Web3CashRegistry',
      version: '1',
      chainId: Number(chainId),
      verifyingContract,
    },
    {
      Bind: [
        { name: 'wallet', type: 'address' },
        { name: 'platform', type: 'bytes32' },
        { name: 'handleHash', type: 'bytes32' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    payload,
  );
}

describe('Web3CashRegistry', () => {
  let owner: any, attestor: any, alice: any, mallory: any;
  let registry: Web3CashRegistry;

  beforeEach(async () => {
    [owner, attestor, alice, mallory] = await ethers.getSigners();
    const Reg = await ethers.getContractFactory('Web3CashRegistry');
    registry = (await Reg.deploy(owner.address, attestor.address)) as unknown as Web3CashRegistry;
    await registry.waitForDeployment();
  });

  it('binds with a valid attestor signature', async () => {
    const handleHash = ethers.keccak256(ethers.toUtf8Bytes('alice_handle'));
    const deadline = BigInt((await time.latest()) + 3600);
    const sig = await signBind(attestor, await registry.getAddress(), {
      wallet: alice.address,
      platform: TWITTER,
      handleHash,
      nonce: 0n,
      deadline,
    });

    await expect(registry.bind(alice.address, TWITTER, handleHash, deadline, sig))
      .to.emit(registry, 'Bound')
      .withArgs(alice.address, TWITTER, handleHash, 0n);

    expect(await registry.bindingOf(alice.address, TWITTER)).to.eq(handleHash);
    expect(await registry.nonces(alice.address)).to.eq(1n);
  });

  it('rejects double-binding the same platform', async () => {
    const h = ethers.keccak256(ethers.toUtf8Bytes('a'));
    const deadline = BigInt((await time.latest()) + 3600);
    const sig = await signBind(attestor, await registry.getAddress(), {
      wallet: alice.address,
      platform: TWITTER,
      handleHash: h,
      nonce: 0n,
      deadline,
    });
    await registry.bind(alice.address, TWITTER, h, deadline, sig);

    const sig2 = await signBind(attestor, await registry.getAddress(), {
      wallet: alice.address,
      platform: TWITTER,
      handleHash: ethers.keccak256(ethers.toUtf8Bytes('b')),
      nonce: 1n,
      deadline,
    });
    await expect(
      registry.bind(
        alice.address,
        TWITTER,
        ethers.keccak256(ethers.toUtf8Bytes('b')),
        deadline,
        sig2,
      ),
    ).to.be.revertedWithCustomError(registry, 'AlreadyBound');
  });

  it('rejects forged signatures', async () => {
    const h = ethers.keccak256(ethers.toUtf8Bytes('a'));
    const deadline = BigInt((await time.latest()) + 3600);
    const sig = await signBind(mallory, await registry.getAddress(), {
      wallet: alice.address,
      platform: TWITTER,
      handleHash: h,
      nonce: 0n,
      deadline,
    });
    await expect(
      registry.bind(alice.address, TWITTER, h, deadline, sig),
    ).to.be.revertedWithCustomError(registry, 'InvalidSignature');
  });

  it('allows different platforms for the same wallet', async () => {
    const h1 = ethers.keccak256(ethers.toUtf8Bytes('twitter_handle'));
    const h2 = ethers.keccak256(ethers.toUtf8Bytes('discord_handle'));
    const deadline = BigInt((await time.latest()) + 3600);

    const s1 = await signBind(attestor, await registry.getAddress(), {
      wallet: alice.address,
      platform: TWITTER,
      handleHash: h1,
      nonce: 0n,
      deadline,
    });
    await registry.bind(alice.address, TWITTER, h1, deadline, s1);

    const s2 = await signBind(attestor, await registry.getAddress(), {
      wallet: alice.address,
      platform: DISCORD,
      handleHash: h2,
      nonce: 1n,
      deadline,
    });
    await registry.bind(alice.address, DISCORD, h2, deadline, s2);

    expect(await registry.bindingOf(alice.address, TWITTER)).to.eq(h1);
    expect(await registry.bindingOf(alice.address, DISCORD)).to.eq(h2);
  });

  it('owner rotates attestor', async () => {
    await expect(registry.connect(owner).setAttestor(mallory.address))
      .to.emit(registry, 'AttestorRotated')
      .withArgs(attestor.address, mallory.address);
  });
});
