import { aggregate } from '@makerdao/multicall';
import * as scAddr from './address/index';

export async function getFunnyAuctionInfo(rpc, chainId, account) {
  if (!rpc || !chainId) {
    return undefined;
  }

  // console.debug('chainId', chainId);

  const funnySc = scAddr.FUNNY_AUCTION_ADDR[Number(chainId).toString()];
  const waspToken = scAddr.WASP_ADDR[Number(chainId).toString()];
  const config = {
    rpcUrl: rpc,
    multicallAddress: scAddr.MULTI_CALL_ADDR[Number(chainId).toString()]
  };

  const calls = [
    {
      target: funnySc,
      call: ['getStatus()(uint256)'],
      returns: [['status', val => Number(val)]]
    },
    {
      target: funnySc,
      call: ['currentGoodValue()(uint256)'],
      returns: [['goodsValue', val => val / 10 ** 18]]
    },
    {
      target: funnySc,
      call: ['getPlayersInfo()(address[], uint256[])'],
      returns: [['players'], ['bids', val => val.map(v => v / 10 ** 18)]]
    },
    {
      target: funnySc,
      call: ['lastOfferBlock()(uint256)'],
      returns: [['lastOfferBlock', val => Number(val)]]
    },
    {
      target: funnySc,
      call: ['currentBidPrice()(uint256)'],
      returns: [['currentBidPrice', val => Number((val / 10 ** 18).toFixed(0))]]
    },
    {
      target: funnySc,
      call: ['coldDownBlock()(uint256)'],
      returns: [['coldDownBlock', val => Number(val)]]
    },
    {
      target: funnySc,
      call: ['confirmBlock()(uint256)'],
      returns: [['confirmBlock', val => Number(val)]]
    },
  ];

  if (account) {
    calls.push({
      target: waspToken,
      call: ['balanceOf(address)(uint256)', account],
      returns: [['waspBalance', val => Number(val) > 0 ? (val / 10 ** 18 - 0.5).toFixed(0) : 0]]
    });
    calls.push({
      target: funnySc,
      call: ['assetMap(address)(uint256)', account],
      returns: [['asset', val => val / 10 ** 18]]
    });
    calls.push({
      target: funnySc,
      call: ['bidMap(address)(uint256)', account],
      returns: [['bid', val => val / 10 ** 18]]
    });
  }

  try {
    let ret = await aggregate(calls, config);
    console.debug('sc info', ret);
    return ret;
  } catch (error) {
    console.log('error', error);
  }
}
