import Web3 from 'web3';
import scAbi from './abi/FunnyAuction.json';
import * as scAddr from './address/index';
import {getWeb3} from './web3switch';
import erc20Abi from './abi/Erc20.json';
import aucAbi from './abi/FunnyAuction.json';

export const addLiquidity = async (value, account, wallet, chainId, goodsToken) => {
  const funnySc = scAddr.FUNNY_AUCTION_ADDR[goodsToken][Number(chainId).toString()];

  const txParam = {
    gasPrice: '0x3B9ACA00', // 1e9
    to: funnySc,
    value: '0x' + Web3.utils.toBN(Web3.utils.toWei(value.toString())).toString('hex'),
    data: '0x',
  }

  const txHash = await wallet.sendTransaction(txParam);
  console.log('txHash', txHash);
  return txHash;
}

export const withdraw = async (wallet, chainId, goodsToken) => {
  const data = '0x3ccfd60b'; //withdraw();
  const funnySc = scAddr.FUNNY_AUCTION_ADDR[goodsToken][Number(chainId).toString()];

  const txParam = {
    gasPrice: '0x3B9ACA00', // 1e9
    to: funnySc,
    value: '0x0',
    data,
  }

  const txHash = await wallet.sendTransaction(txParam);
  console.log('txHash', txHash);
  return txHash;
}

export const claim = async (wallet, chainId, goodsToken) => {
  const data = '0x4e71d92d'; //claim();
  const funnySc = scAddr.FUNNY_AUCTION_ADDR[goodsToken][Number(chainId).toString()];

  const txParam = {
    gasPrice: '0x3B9ACA00', // 1e9
    to: funnySc,
    value: '0x0',
    data,
  };

  const txHash = await wallet.sendTransaction(txParam);
  console.log('txHash', txHash);
  return txHash;
}

export const settlement = async (wallet, chainId, goodsToken) => {
  const data = '0x51160630'; //settlement();
  const funnySc = scAddr.FUNNY_AUCTION_ADDR[goodsToken][Number(chainId).toString()];

  const txParam = {
    gasPrice: '0x3B9ACA00', // 1e9
    to: funnySc,
    value: '0x0',
    data,
  };

  const txHash = await wallet.sendTransaction(txParam);
  console.log('txHash', txHash);
  return txHash;
}

export const approve = async (wallet, chainId, account, goodsToken) => {
  const web3 = getWeb3();
  const funnySc = scAddr.FUNNY_AUCTION_ADDR[goodsToken][Number(chainId).toString()];
  const wasp = scAddr.WASP_ADDR[Number(chainId).toString()];
  const sc = new web3.eth.Contract(erc20Abi, wasp);
  const allowance = await sc.methods.allowance(account, funnySc).call();
  console.log('allowance', Number(web3.utils.fromWei(allowance.toString())));
  if (Number(web3.utils.fromWei(allowance.toString())) < 1e10) {
    const data = await sc.methods.approve(funnySc, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffe').encodeABI();
    const txParam = {
      gasPrice: '0x3B9ACA00', // 1e9
      to: wasp,
      value: '0x0',
      data,
    };
  
    const txHash = await wallet.sendTransaction(txParam);
    console.log('txHash', txHash);
    return txHash;
  }
}

export const offer = async (wallet, chainId, amount, goodsToken) => {
  const web3 = getWeb3();
  const funnySc = scAddr.FUNNY_AUCTION_ADDR[goodsToken][Number(chainId).toString()];
  const sc = new web3.eth.Contract(aucAbi, funnySc);
  const data = await sc.methods.offer(web3.utils.toWei(amount.toString())).encodeABI();
  const txParam = {
    gasPrice: '0x3B9ACA00', // 1e9
    to: funnySc,
    value: '0x0',
    data,
  };

  const txHash = await wallet.sendTransaction(txParam);
  console.log('txHash', txHash);
  return txHash;
}
