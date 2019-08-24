var express = require('express');
const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx').Transaction;
const config = require('../config');
let walletABI = require('../abi/wallet.json');
const testABI = require('../abi/test.json');

var router = express.Router();
const web3 = new Web3(config.INFURA.KOVAN);

function link(bytecode, libName, libAddress) {
    let symbol = "__" + libName + "_".repeat(40 - libName.length - 2);
    return bytecode.split(symbol).join(libAddress.toLowerCase().substr(2))
  }

walletABI.bytecode = link(walletABI.bytecode, "ECTools", config.ECTools_ADDRESS.KOVAN);



const privateKey = Buffer.from(
  config.FAUCET_PRIVATE_KEY,
  'hex',
)

/* Create raw prefund tx*/
const createRawPrefundTx = async (toAddress) => {
  const nonce = await web3.eth.getTransactionCount(config.FAUCET_ADDRESS);
  const txParams = {
  nonce: web3.utils.toHex(nonce),
  gasPrice: '0x37E11D600',
  gasLimit: web3.utils.toHex(90000),
  to: toAddress,
  value: web3.utils.toHex(web3.utils.toWei('0.05', 'ether')),
}

const tx = new EthereumTx(txParams, { chain: config.NETWORK});
tx.sign(privateKey)
const serializedTx = tx.serialize().toString('hex');

return `0x${serializedTx}`;
};

/* Create raw contract deployment tx*/
const createRawWalletDeployTx = async (eoa) => {
  const walletContract = new web3.eth.Contract(walletABI.abi);
  const encodeAbi = walletContract.deploy({
    data: walletABI.bytecode,
    arguments: [eoa.address]
  }).encodeABI();

  const nonce = await web3.eth.getTransactionCount(eoa.address);
  const txParams = {
  nonce: web3.utils.toHex(nonce),
  gasPrice: '0x37E11D600',
  gasLimit: web3.utils.toHex(1990000),
  data: encodeAbi,
  }

  const tx = new EthereumTx(txParams, { chain: config.NETWORK});
  tx.sign(Buffer.from(eoa.privateKey.substring(2), 'hex'));
  const serializedTx = tx.serialize().toString('hex');

  return `0x${serializedTx}`;
}

/* Creates a new wallet */
router.post('/', async (req, res, ext) => {
  // create eoa
  const eoa = web3.eth.accounts.create();
  // console.log(eoa);

  // prefund eoa
  const signedTx = await createRawPrefundTx(eoa.address);
  const prefundReceipt = await web3.eth.sendSignedTransaction(signedTx);

  // deploy the smart contract wallet
  const walletSignedTx = await createRawWalletDeployTx(eoa);
  const walletReceipt = await web3.eth.sendSignedTransaction(walletSignedTx);

  res.send({
    eoaAddress: eoa.address,
    eoaPrivateKey: eoa.privateKey,
    walletAddress: walletReceipt.contractAddress
  });

});
/*
TODO:
- Create an EOA - done
- Prefund EOA with 0.05 eth - done
- Deploy a smart contract wallet - donne
- Return EOA private key and smart contract address - done
*/

module.exports = router;
