import Web3 from 'web3';
import { networkId } from './config';

let nodeUrlsTestnet = [
    // 'wss://apitest.wanchain.org:8443/ws/v3/30e9d7131a7fa1557eeeb9ffb18f0a2f66aee81a550ee857343136e5c04b5785',
    // 'https://cat.molin.tech:48545',
    'https://gwan-ssl.wandevs.org:46891',
    'https://demodex.wandevs.org:48545',
];

let nodeUrlsMainnet = [
    'https://gwan-ssl.wandevs.org:56891'
]

let nodeUrls = networkId === 1 ? nodeUrlsMainnet : nodeUrlsTestnet;

let web3s = [];
let web3select = 0;
let switchFinish = false;

// console.log('ready to new web3...');
for (let i=0; i<nodeUrls.length; i++) {
    try {
        if (nodeUrls[i].indexOf('ws') === 0) {
            web3s.push(new Web3(new Web3.providers.WebsocketProvider(nodeUrls[i])));
        } else {
            web3s.push(new Web3(new Web3.providers.HttpProvider(nodeUrls[i])));
        }
    } catch (err) {
        console.log(err);
    }
}

export const getFastWeb3 = async () => {
    let timeout = 5000;

    // console.log('Search fast web3...timeout:', timeout);
    let funcs = [];
    for (let i = 0; i < web3s.length; i++) {
        let func = async () => {
            let t0 = Date.now();
            let tmpFunc = [];
            try {
                tmpFunc.push(new Promise((resolve, reject) => {
                    setTimeout(resolve, timeout, 'timeout');
                }));
                tmpFunc.push(web3s[i].eth.net.getId());

                let ret = await Promise.race(tmpFunc);
                if (ret === 'timeout') {
                    console.log('timeout:', i, nodeUrls[i], Date.now() - t0);
                    return { delay: 100000, index: i };
                }
            } catch (err) {
                console.log('net error:', i, nodeUrls[i]);
                return { delay: 100000, index: i };
            }
            let t1 = Date.now() - t0;
            if (nodeUrls[i].includes('http')) {
                t1 += 1000;
            }
            return { delay: t1, index: i, url: nodeUrls[i] };
        }
        funcs.push(func());
    }
    let ret = await Promise.all(funcs);
    ret.sort((a, b) => (a.delay - b.delay));
    // console.log(ret);
    web3select = ret[0].index;
    // console.log('web3select', web3select, nodeUrls[web3select]);
    switchFinish = true;
}

export const getWeb3 = () => {
    return web3s[web3select];
}

export const getNodeUrl = () => {
    return nodeUrls[web3select];
}

export const isSwitchFinish = () => {
    return switchFinish;
}

getFastWeb3();

