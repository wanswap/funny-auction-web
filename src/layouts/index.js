import React, { useEffect, useState } from 'react';

import styled, { keyframes } from 'styled-components';
import { Link } from 'umi';
import { Wallet, getSelectedAccount, getSelectedAccountWallet, WalletButton } from "wan-web-wallet";
import "wan-web-wallet/index.css";
import { withRouter } from 'umi';
import { connect } from 'react-redux';
import { getNodeUrl, getFastWeb3 } from '../utils/web3switch.js';
import { useIntl, getLocale, getAllLocales, setLocale } from 'umi';
import { Modal, Input, Row, Col, Tooltip, message } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import "./index.css";
import * as multicall from '../utils/multicall';
import * as sc from '../utils/sc';

console.log('getLocale', getLocale());
console.log('all locales', getAllLocales());

function BasicLayout(props) {
  const [rpc, setRpc] = useState(undefined);
  const intl = useIntl();
  const [blockNumber, setBlockNumber] = useState('--');
  const [info, setInfo] = useState();
  const [showGameRule, setShowGameRule] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showBid, setShowBid] = useState(false);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [addValue, setAddValue] = useState(0);
  const [finalBlock, setFinalBlock] = useState(0);
  const active = info && info.goodsValue && info.goodsValue > 0 ? true : false;
  const totalAsset = info && (Number(info.waspBalance) + info.asset + info.bid);
  const currentPrice = info && info.status === 0 ? 0 : info && info.currentBidPrice;
  const bid = info && info.status === 0 ? 0 : info && info.bid;
  const status = info && info.status;
  const [language, setLanguage] = useState();
  const curLang = getLocale();
  const [goodsToken, setGoodsToken] = useState('WAN');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!curLang.includes('zh')) {
      setLanguage('中文');
    } else {
      setLanguage('English');
    }
  }, [curLang]);


  useEffect(() => {
    const func = async () => {
      await getFastWeb3();
      setRpc(getNodeUrl());
    }
    func();
  }, []);
  window.setLocale = setLocale;

  const address = props.selectedAccount ? props.selectedAccount.get('address') : undefined;

  useEffect(() => {
    if (!props.networkId) {
      return;
    }
    let timer;
    const getInfo = async () => {
      let ret = await multicall.getFunnyAuctionInfo(getNodeUrl(), props.networkId, address, goodsToken);
      if (ret) {
        setBlockNumber(Number(ret.results.blockNumber.toString()));
        setInfo(ret.results.transformed);
        setFinalBlock(ret.results.blockNumber - ret.results.transformed.lastOfferBlock);
      }
      timer = setTimeout(getInfo, 10000);
    }

    getInfo();


    const getHistory = async ()=>{
      let ret = await sc.history(props.networkId, goodsToken)
      if (ret) {
        ret = ret.reverse().slice(0, 5);
        let historyData = [];
        for (let i=0; i<ret.length; i++) {
          historyData.push({
            block: ret[i].blockNumber,
            addr: ret[i].returnValues.user.slice(0, 6) + '...' + ret[i].returnValues.user.slice(-4),
            ret: (ret[i].returnValues.value/10**18).toFixed(0),
            price: await sc.getHistoryPrice(ret[i].blockNumber, props.networkId, goodsToken),
          });
        }
        console.log('historyData', historyData);
        setHistory(historyData);
      }
    }

    getHistory();

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    }
  }, [props.networkId, address, goodsToken]);

  let rank = [];

  rank = !info ? [] : info.players.map((v, i) => {
    return {
      address: v.slice(0, 6) + '...' + v.slice(-4),
      pay: info.bids[i],
    }
  });

  rank = rank.sort((a, b) => {
    return b.pay - a.pay;
  });

  rank = rank.map((v, i) => {
    const returns = i === 0 ? (info.goodsValue) : v.pay;
    return {
      ...v,
      rank: i + 1,
      return: returns + ((i === 0) ? (' ' + goodsToken) : ' WASP')
    }
  });


  return (
    <Ground>
      {
        rpc
          ? <Wallet title="WanSwap" nodeUrl={rpc} />
          : null
      }
      <GameRuleModal visible={showGameRule} onCancel={() => { setShowGameRule(false) }} />
      <AssetsModal visible={showAssets}
        onCancel={() => { setShowAssets(false) }}
        waspBalance={info && info.waspBalance}
        asset={info && info.asset} bid={info && info.bid}
        goodsToken={goodsToken}
        wallet={props.selectedWallet} chainId={props.networkId} />
      <BidModal visible={showBid}
        currentPrice={currentPrice}
        value={info ? info.goodsValue : '--'}
        goodsToken={goodsToken}
        onCancel={() => { setShowBid(false) }} onOk={(value) => {
          setAddValue(value);
          setShowBid(false);
          setShowPayConfirm(true);
        }} />
      <PayConfirmModal visible={showPayConfirm}
        onCancel={() => { setShowPayConfirm(false) }}
        addValue={Number(addValue)} waspBalance={info && info.waspBalance}
        asset={info && info.asset} bid={bid} currentBidPrice={currentPrice}
        chainId={props.networkId}
        wallet={props.selectedWallet}
        goodsToken={goodsToken}
        account={address} />
      <TopBar>
        <Logo>
          <img src={require('../assets/192x192_App_Icon.png')} width="48"/>
        </Logo>
        <Tab to="/" selected={goodsToken === 'WAN'} onClick={() => { setGoodsToken('WAN') }}>{intl.messages['wanAuction']}</Tab>
        <Tab to="/" selected={goodsToken === 'FNX'} onClick={() => { setGoodsToken('FNX') }}>{intl.messages['fnxAuction']}</Tab>
        {
          status === 0 && info && info.currentBidPrice > 0
            ? <Tab to="/" onClick={() => {
              sc.settlement(props.selectedWallet, props.networkId, goodsToken).then((ret) => {
                console.log('ret', ret);
                message.success("Tx sent: " + ret);
              }).catch(err => {
                console.log('err', err);
                message.error(err.message);
              })
            }} >{intl.messages['settlement']}</Tab>
            : null
        }
        <GameRule onClick={() => { setShowGameRule(true) }}>{intl.messages['gameRules']}</GameRule>
        <Language onClick={() => {
          if (curLang.includes('zh')) {
            setLocale('en-US', false);
          } else {
            setLocale('zh-CN', false);
          }
        }}>{language}</Language>
        {
          rpc
            ? <>
              <Assets onClick={() => { setShowAssets(true) }}>{intl.messages['myAssets'] + ': ' + (totalAsset ? totalAsset : '0') + ' WASP'}</Assets>
              <WalletBt><WalletButton /></WalletBt>
            </>
            : null
        }
      </TopBar>
      <Title>{intl.messages['auctionBidFor'] + ' ' + (info ? info.goodsValue : '--') + (' ' + goodsToken)}</Title>
      <Coin amount={info ? info.goodsValue : '--'} goodsToken={goodsToken}/>
      <Circle>
        <p style={{ fontSize: "58px" }}>100</p>
        <p style={{ fontSize: "20px" }}>Wan Coins</p>
      </Circle>
      <SmallTitle>{
        info && info.status !== 0
          ? intl.messages['currentPrice'] + (info ? info.currentBidPrice : 0) + " WASP"
          : null
      }</SmallTitle>
      <MainButton disable={!active || status === 1} onClick={() => {
        if (active && status !== 1) {
          setShowBid(true)
        }
      }}>
        {
          active
            ? (
              status === 0
                ? intl.messages['startGame']
                : null
            )
            : null
        }
        {
          active
            ? (
              status === 1
                ? intl.messages['gameOver']
                : null
            )
            : null
        }
        {
          active
            ? (
              status === 2
                ? intl.messages['addBid']
                : null
            )
            : null
        }
        {
          !active
            ? intl.messages['liquidityEmpty']
            : null
        }
      </MainButton>
      <SmallTitle>
        {
          info && info.status === 2
            ? intl.messages['timeLeft'] + ' ' + finalBlock + " / " + info.confirmBlock + " blocks"
            : null
        }
        {
          info && info.status === 1
            ? intl.messages['coldDown'] + ' ' + (finalBlock - info.confirmBlock) + " / " + info.coldDownBlock + " blocks"
            : null
        }
        {
          info && info.status === 0
            ? intl.messages['gameOver']
            : null
        }
      </SmallTitle>
      {
        rank.length > 0
          ? <>
            <Title>
              {
                status === 2
                  ? intl.messages['currentRank']
                  : intl.messages['lastRoundRank']
              }
            </Title>
            <Header>
              <Cell>{intl.messages['rank']}</Cell>
              <Cell long>{intl.messages['address']}</Cell>
              <Cell long>{intl.messages['pay']}</Cell>
            </Header>
            {
              rank.map((v, i) => {
                return (<TableRow key={i}>
                  <Cell>{v.rank}</Cell>
                  <Cell long>{v.address}</Cell>
                  <Cell long>{Number(v.pay).toFixed(0) + ' WASP'}</Cell>
                </TableRow>);
              })
            }
          </>
          : null
      }
      <Title>{intl.messages['history']}</Title>
      <Header>
        <Cell>{intl.messages['block']}</Cell>
        <Cell long>{intl.messages['address']}</Cell>
        <Cell long>{intl.messages['pay']}</Cell>
        <Cell long>{intl.messages['return']}</Cell>
      </Header>
      {
        history.map((v, i) => {
          return (<TableRow key={i}>
            <Cell>{v.block}</Cell>
            <Cell long>{v.addr}</Cell>
            <Cell long>{v.price + ' WASP'}</Cell>
            <Cell long>{Number(v.ret).toFixed(0) + ' ' + goodsToken}</Cell>
          </TableRow>);
        })
      }
      <Title></Title>
      <BlockNumber>🔵{' ' + blockNumber}</BlockNumber>
    </Ground>
  );
}

export default withRouter(connect(state => {
  const selectedAccountID = state.WalletReducer.get('selectedAccountID');
  return {
    selectedAccount: getSelectedAccount(state),
    selectedWallet: getSelectedAccountWallet(state),
    networkId: state.WalletReducer.getIn(['accounts', selectedAccountID, 'networkId']),
    selectedAccountID,
  }
})(BasicLayout));

const GameRuleModal = (props) => {
  const intl = useIntl();
  return (
    <StyledModal
      visible={props.visible}
      onCancel={props.onCancel}
      footer={null}
    >
      <ModalTitle>{intl.messages['gameRule']}</ModalTitle>
      <ModalH2>{intl.messages['gameRule1']}</ModalH2>
      <ModalH2>{intl.messages['gameRule2']}</ModalH2>
      <ModalH2>{intl.messages['gameRule3']}</ModalH2>
      <ModalH2>{intl.messages['gameRule4']}</ModalH2>
      <ModalH2>{intl.messages['gameRule5']}</ModalH2>
      <ModalH2>{intl.messages['gameRule6']}</ModalH2>
      <ModalH2>{intl.messages['gameRule7']}</ModalH2>
      <a href="https://github.com/wanswap/funny-auction-web" style={{ marginLeft: "20px" }}>Github</a>

      <MainButton onClick={props.onCancel} style={{ marginTop: "40px" }}>{intl.messages['ok']}</MainButton>
    </StyledModal>
  );
}

const AssetsModal = (props) => {
  const intl = useIntl();
  const [disable, setDisable] = useState(false);
  return (
    <StyledModal
      visible={props.visible}
      onCancel={props.onCancel}
      footer={null}
    >
      <ModalTitle>{intl.messages['myAssets']}</ModalTitle>
      <InALine>
        <SuperBigLabel>{Number(props.waspBalance) + props.asset + props.bid}</SuperBigLabel>
        <TextInside>WASP</TextInside>
      </InALine>
      <GridField>
        <Row gutter={[24, 24]}>
          <Col span={8}>{intl.messages['walletBalance']}</Col>
          <Col span={10}>{Number(props.waspBalance) < 1 ? '0': props.waspBalance} WASP</Col>
          <Col span={6}></Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={8}>{intl.messages['claimable']}</Col>
          <Col span={10}>{props.asset} WASP</Col>
          <Col span={6}>
            <SmallButton disable={disable} onClick={() => {
              setDisable(true);
              sc.claim(props.wallet, props.chainId, props.goodsToken).then(ret => {
                console.log(ret);
                message.success("tx sent" + ret);
                setDisable(false);
              }).catch(err => {
                console.log('err', err);
                message.error(err.message);
                setDisable(false);
              })
            }}>{intl.messages['claim']}</SmallButton>
          </Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={8}>{intl.messages['lockedBalance']}</Col>
          <Col span={10}>{props.bid} WASP</Col>
          <Col span={6}>
            <Tooltip title={intl.messages['lockedTooltip']}>
              <QuestionCircleOutlined />
            </Tooltip>
          </Col>
        </Row>
      </GridField>
      <MainButton onClick={props.onCancel} style={{ marginTop: "40px" }}>{intl.messages['close']}</MainButton>
    </StyledModal>
  );
}

const BidModal = (props) => {
  const intl = useIntl();
  const [select, setSelect] = useState("1");
  const [value, setValue] = useState(1);
  return (
    <StyledModal
      visible={props.visible}
      onCancel={props.onCancel}
      footer={null}
    >
      <ModalTitle>{intl.messages['auctionBidFor'] + ' ' + props.value + ' ' + props.goodsToken}</ModalTitle>
      <SmallTitle>{intl.messages['currentPrice'] + props.currentPrice + " WASP"}</SmallTitle>
      <GridField>
        <Row gutter={[24, 24]}>
          <Col span={6}>{intl.messages['addBid']}</Col>
          <Col span={8}><SmallButton selected={select === "1"} onClick={() => { setSelect('1'); setValue(1); }}>+1 WASP</SmallButton></Col>
          <Col span={8}><SmallButton selected={select === "2"} onClick={() => { setSelect('2'); setValue(2); }}>+2 WASP</SmallButton></Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={6}></Col>
          <Col span={8}><SmallButton selected={select === "5"} onClick={() => { setSelect('5'); setValue(5); }}>+5 WASP</SmallButton></Col>
          <Col span={8}><SmallButton selected={select === "10"} onClick={() => { setSelect('10'); setValue(10); }}>+10 WASP</SmallButton></Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={6}></Col>
          <Col span={8}><SmallButton selected selected={select === "custom"} onClick={() => { setSelect('custom') }}>{intl.messages['custom'] + ' +'}</SmallButton></Col>
          <Col span={8}>
            {
              select === "custom"
                ? <SmallInput suffix={'WASP'} value={value} onChange={(e) => {
                  const v = e.target.value;
                  if (isNaN(v) || v < 0) {
                    return;
                  }

                  setValue(Number(v).toFixed(0));
                }} />
                : null
            }
          </Col>
        </Row>
      </GridField>
      <MainButton onClick={() => {
        props.onOk(value)
      }} style={{ marginTop: "40px" }}>{intl.messages['ok']}</MainButton>
      <MainButton onClick={props.onCancel} style={{ marginTop: "40px" }}>{intl.messages['cancel']}</MainButton>
    </StyledModal>
  );
}

const PayConfirmModal = (props) => {
  const intl = useIntl();
  let asset = Number(props.asset);
  let bid = Number(props.bid);
  let add = Number(props.currentBidPrice) + Number(props.addValue) - bid;
  if (asset >= add) {
    asset = add;
  }
  const [disable, setDisable] = useState(false);

  return (
    <StyledModal
      visible={props.visible}
      onCancel={props.onCancel}
      footer={null}
    >
      <ModalTitle>{intl.messages['payConfirm']}</ModalTitle>
      <GridField>
        <Row gutter={[24, 24]}>
          <Col span={10}>{intl.messages['bid']}</Col>
          <Col span={8}>{bid + add} WASP</Col>
          <Col span={6}></Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={10}>{intl.messages['payFromClaimable']}</Col>
          <Col span={8}>{asset} WASP</Col>
          <Col span={6}>
            <Tooltip title={intl.messages['payFromHelp1']}>
              <QuestionCircleOutlined />
            </Tooltip>
          </Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={10}>{intl.messages['payFromWallet']}</Col>
          <Col span={8}>{add > asset ? (add - asset) : 0} WASP</Col>
          <Col span={6}>
            <Tooltip title={intl.messages['payFromHelp2']}>
              <QuestionCircleOutlined />
            </Tooltip>
          </Col>
        </Row>
      </GridField>
      <MainButton disable={disable} onClick={() => {
        if (!props.account) {
          message.info("Please select wallet first");
          return;
        }
        setDisable(true);
        sc.approve(props.wallet, props.chainId, props.account, props.goodsToken).then((ret) => {
          sc.offer(props.wallet, props.chainId, Number(props.currentBidPrice) + Number(props.addValue), props.goodsToken).then((ret) => {
            console.log('ret', ret);
            message.success("Tx sent: " + ret);
            props.onCancel();
            setDisable(false);
          }).catch(err => {
            console.log('err', err);
            message.error(err.message);
            props.onCancel();
            setDisable(false);
          })
        }).catch(err => {
          console.log(err);
          message.error(err.message);
        });
      }} style={{ marginTop: "40px" }}>{intl.messages['ok']}</MainButton>
      <MainButton onClick={props.onCancel} style={{ marginTop: "40px" }}>{intl.messages['cancel']}</MainButton>
    </StyledModal>
  );
}

const Coin = (props) => {
  return (
    <div className='coin'>
      <div className='front jump'>
        <div className='star'></div>
        <span className='currency'>{props.amount}</span>
        <div className='shapes'>
          <div className='shape_l'></div>
          <div className='shape_r'></div>
          <span className='top'></span>
          <span className='bottom'>{props.goodsToken}</span>
        </div>
      </div>
      <div className='shadow'></div>
    </div>);
}

const RainbowLight = keyframes`
	0% {
		background-position: 0% 50%;
	}
	50% {
		background-position: 100% 50%;
	}
	100% {
		background-position: 0% 50%;
	}
`

const Ground = styled.div`
  background: url('img/hexagons.png'),-webkit-linear-gradient(45deg, rgba(16, 114, 189, 1) 0%, rgba(16, 114, 189, 1) 23%, rgba(2, 41, 97, 1) 48%, rgba(0, 4, 38, 1) 73%, rgba(0, 0, 21, 1) 100%);
  /* background: linear-gradient(
    45deg,
    rgba(200, 255, 200, 1) 0%,
    rgba(158, 200, 155, 1) 50%,
    rgba(255, 203, 57, 1) 100%
  );
  background-size: 100% 100%;
  background-position: 50%; */
  /* animation: ${RainbowLight} 20s linear infinite; */
  min-height: 100%;
  width: 100%;
  /* padding-bottom: 40px; */
  color: white;
`;

const TopBar = styled.div`
  width: 100%;
  height: 60px;
  background-color: #00000030;
  margin: 0px;
  display:flex;
  justify-content: start;
`;

const Logo = styled.div`
  padding: 6px;
  margin-right: 10px;
  /* font-size: 32px; */
  margin-left: 10px;
`;

const Tab = styled(Link)`
  text-align: center;
  width: auto;
  padding: 8px;
  margin: 6px;
  font-size: 22px;
  font-weight: ${props => props.selected ? "bold" : "normal"};
  color: ${props => props.selected ? "#ffffffff" : "#ffffffbb"};
  background: ${props => props.selected ? "#ffffff21" : "#ffffff00"};
  border-radius: 10px;
`;

const Assets = styled.div`
  cursor: pointer;
  border-radius: 25px;
  height: 36px;
  margin-left: 20px;
  margin-right: 10px;
  /* border: 1px solid white; */
  margin-top: 12px;
  padding: 3px 20px 2px 20px;
  background-color: #489275;
  color: white;
  line-height: 30px;

`

const Language = styled(Assets)`
  background-color: #4a87ab;
`;

const GameRule = styled(Assets)`
  margin-left: auto;
  margin-right: 0px;
  background-color: #4aab6b;
`;

const WalletBt = styled.div`
  border: 1px solid white;
  border-radius: 25px;
  margin: 12px;
  margin-left: 10px;
  margin-right: 20px;
  padding: 2px;
  button {
    background: transparent;
    border: none;
    height: 30px;
    /* width: 220px; */
    font-family: Roboto Condensed;
    font-size: 16px;
    :hover {
      background-color: transparent!important;
    }
  }
`;

const Title = styled.div`
  font-size: 20px;
  line-height: 20px;
  /* border-radius: 10px; */
  height: 50px;
  padding: 16px 20px 15px 20px;
  /* background-color: #e2d4b821; */
  /* color: white; */
  margin-left: auto;
  margin-right: auto;
  text-align: center;
  width: 260px;
  margin-top: 20px;
  border-bottom: 1px solid #909018;
  /* box-shadow: 0px 3px 10px #0000002f; */

`

const Circle = styled.div`
  font-size: 64px;
  line-height: 6px;
  border-radius: 50%;
  height: 200px;
  padding: 76px 20px 15px 20px;
  background-color: #86b1b0;
  color: #ffcf86;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
  width: 200px;
  margin-top: 20px;
  box-shadow: 0px 0px 20px rgb(200 236 144);
  background: radial-gradient(100% 90% at 20% 0%,#f7f1aa 0%,#524814 100%);
  opacity: 0;
`

const SmallTitle = styled.div`
  font-size: 16px;
  line-height: 16px;
  height: 40px;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
  width: 300px;
  margin-top: 20px;
`;

const MainButton = styled.div`
  font-size: 20px;
  line-height: 20px;
  border-radius: 30px;
  height: 50px;
  padding: 16px 20px 15px 20px;
  background-color: #b8fdb6b3;
  /* color: white; */
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 10px;
  text-align: center;
  width: 200px;
  margin-top: 0px;
  box-shadow: 0px 3px 10px #0000002f;
  cursor: ${props => props.disable ? "not-allowed" : "pointer"};
  :hover{
    background-color: #3f728e;
    box-shadow: 0px 3px 10px #ffff338f;
  }
`;

const Header = styled.div`
  width: 600px;
  height: 30px;
  display: flex;
  justify-content: space-around;
  text-align: center;
  margin-left: auto;
  margin-right: auto;
  margin-top: 20px;
  border-bottom: 1px solid #24633b5e;
`;

const TableRow = styled.div`
  width: 600px;
  height: 30px;
  display: flex;
  justify-content: space-around;
  text-align: center;
  margin-left: auto;
  margin-right: auto;
  margin-top: 20px;
  border-bottom: 1px solid #6463002e;
`;

const Cell = styled.div`
  width: ${props => props.long ? "100px" : "60px"};
  text-align: center;
`;

const StyledModal = styled(Modal)`
  width: 600px!important;
  .ant-modal-content {
    border-radius: 15px;
    background:rgb(189 239 218);
  }
`;

const ModalTitle = styled.div`
  width: 100%;
  text-align: center;
  font-size: 22px;
  line-height: 22px;
  padding: 10px;
  font-weight: bold;
  margin-bottom: 40px;
`;

const ModalH1 = styled.div`
  margin: 10px;
  font-size: 18px;
  margin-left: 40px;
`;

const ModalH2 = styled.div`
  margin: 10px;
  font-size: 14px;
`;

const BigLabel = styled.div`
  width: 100%;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  padding-bottom: 16px;
`;

const SmallLabel = styled(BigLabel)`
  font-size: 20px;
  line-height: 52px;
`;

const SuperBigLabel = styled(BigLabel)`
  font-size: 60px;
  font-weight: normal;
  width: auto;
`;

const StyledInput = styled(Input)`
  border-radius: 15px;
  margin-left: 40px;
  margin-right: auto;
  width: 460px;
  margin-top: 10px;
  margin-bottom: 60px;
  .ant-input {
    text-align: center;
  }
`;

const TextInside = styled.div`
  font-size: 18px;
  padding-top: 46px;
  margin-left: 8px;
`;

const InALine = styled.div`
  width: 100%;
  text-align: center;
  display: flex;
  justify-content: center;
`;

const GridField = styled.div`
  margin-top: 20px;
  width: 460px;
  margin: auto;
  font-size: 18px;
  text-align: center;
`;

const SmallButton = styled(MainButton)`
  width: auto;
  height: auto;
  font-size: 14px;
  font-weight: normal;
  padding: 3px;
  background-color: ${props => props.selected ? "#eeffff" : "#b8fdb6b3"};
  box-shadow: ${props => props.selected ? "0px 3px 10px #ffff338f" : "0px 3px 10px #0000002f"};

`;

const SmallInput = styled(StyledInput)`
  margin: 0px;
  width: auto;
`;

const BlockNumber = styled.div`
  position: absolute;
  top: 97vh;
  left: 10px;
  font-size: 12px;
`;
