import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Generates Standard JSON Input for Etherscan verification
 */

const config = {
  language: 'Solidity',
  sources: {
    'contracts/Web3CashRegistry.sol': {
      content: readFileSync(resolve(__dirname, '../contracts/Web3CashRegistry.sol'), 'utf8'),
    },
    'contracts/Web3CashEscrow.sol': {
      content: readFileSync(resolve(__dirname, '../contracts/Web3CashEscrow.sol'), 'utf8'),
    },
    '@openzeppelin/contracts/access/Ownable.sol': {
      content: readFileSync(
        resolve(__dirname, '../node_modules/@openzeppelin/contracts/access/Ownable.sol'),
        'utf8'
      ),
    },
    '@openzeppelin/contracts/utils/Context.sol': {
      content: readFileSync(
        resolve(__dirname, '../node_modules/@openzeppelin/contracts/utils/Context.sol'),
        'utf8'
      ),
    },
    '@openzeppelin/contracts/utils/cryptography/EIP712.sol': {
      content: readFileSync(
        resolve(__dirname, '../node_modules/@openzeppelin/contracts/utils/cryptography/EIP712.sol'),
        'utf8'
      ),
    },
    '@openzeppelin/contracts/utils/cryptography/ECDSA.sol': {
      content: readFileSync(
        resolve(__dirname, '../node_modules/@openzeppelin/contracts/utils/cryptography/ECDSA.sol'),
        'utf8'
      ),
    },
    '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol': {
      content: readFileSync(
        resolve(
          __dirname,
          '../node_modules/@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol'
        ),
        'utf8'
      ),
    },
    '@openzeppelin/contracts/token/ERC20/IERC20.sol': {
      content: readFileSync(
        resolve(__dirname, '../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol'),
        'utf8'
      ),
    },
    '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol': {
      content: readFileSync(
        resolve(
          __dirname,
          '../node_modules/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol'
        ),
        'utf8'
      ),
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers'],
        '': ['ast'],
      },
    },
  },
};

writeFileSync(
  resolve(__dirname, '../verification-input.json'),
  JSON.stringify(config, null, 2)
);

console.log('✅ Generated verification-input.json');
console.log('\nUpload this file to Etherscan using Standard JSON Input method');
