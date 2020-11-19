import React, { useEffect, useState, useMemo, useCallback } from 'react';

import styled, { keyframes } from 'styled-components';
import { Link } from 'umi';
import { Wallet, getSelectedAccount, getSelectedAccountWallet, WalletButton } from "wan-web-wallet";
import "wan-web-wallet/index.css";
import { withRouter } from 'umi';
import { connect } from 'react-redux';
import { getNodeUrl, isSwitchFinish, getFastWeb3 } from '../utils/web3switch.js';
import { useIntl, getLocale } from 'umi';
import { Modal, Input, Row, Col, Button, Tooltip, message } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import Web3 from 'web3';
import "./index.css";
import * as multicall from '../utils/multicall';
import * as sc from '../utils/sc';

console.log('getLocale', getLocale());

function BasicLayout(props) {
  const [rpc, setRpc] = useState(undefined);
  const intl = useIntl();
  const [blockNumber, setBlockNumber] = useState('--');
  const [info, setInfo] = useState();
  useEffect(() => {
    const func = async () => {
      await getFastWeb3();
      setRpc(getNodeUrl());
    }
    func();
  }, []);

  useEffect(() => {
    if (!props.networkId) {
      return;
    }

    let timer;
    const getInfo = async () => {
      let ret = await multicall.getFunnyAuctionInfo(getNodeUrl(), props.networkId, props.selectedAccount ? props.selectedAccount.get('address') : undefined);
      setBlockNumber(Number(ret.results.blockNumber.toString()));
      setInfo(ret.results.transformed);
      timer = setTimeout(getInfo, 5000);
    }

    getInfo();

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    }
  }, [props.networkId, props.selectedAccount]);

  const balance = useCallback(() => {
    if (!props.selectedAccount) {
      return "0";
    }
    return Number(Web3.utils.fromWei(props.selectedAccount.get('balance').toFixed(0))).toFixed(0);
  }, [props.selectedAccount]);

  let rank = [
    {
      rank: 1,
      address: '0x4Cf0...7D9e',
      status: 'Winner',
      pay: '15 WAN',
      return: '85 WAN',
    },
    {
      rank: 2,
      address: '0x4Cf0...7D9e',
      status: 'Loser',
      pay: '14 WAN',
      return: '0 WAN',
    },
    {
      rank: 3,
      address: '0x4Cf0...7D9e',
      status: '',
      pay: '10 WAN',
      return: '10 WAN',
    },
    {
      rank: 4,
      address: '0x4Cf0...7D9e',
      status: '',
      pay: '8 WAN',
      return: '8 WAN',
    },
  ];

  rank = !info ? [] : info.players.map((v, i) => {
    return {
      address: v,
      pay: info.bids[i] / 10 ** 18,
    }
  });

  rank = rank.sort((a, b) => {
    return a.pay - b.pay;
  });

  rank = rank.map((v, i) => {
    const status = i === 0 ? 'Winner' : (i === 1 ? 'Loser' : '--');
    const returns = i === 0 ? (info.goodsValue - v.pay) : (i === 1 ? (0) : v.pay);
    return {
      ...v,
      rank: i + 1,
      status,
      return: returns + ' WAN'
    }
  });

  const [showLiquidity, setShowLiquidity] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showGameRule, setShowGameRule] = useState(true);
  const [showAssets, setShowAssets] = useState(false);
  const [showBid, setShowBid] = useState(false);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [bidValue, setBidValue] = useState(0);
  const [loading, setLoading] = useState(false);

  return (
    <Ground>
      {
        rpc
          ? <Wallet title="WanSwap" nodeUrl={rpc} />
          : null
      }
      <LiquidityModal visible={showLiquidity}
        totalLiquidity={info ? info.liquidityPool : 0}
        totalSupply={info ? info.totalSupply : 0}
        myLiquidity={info ? (info.myLiquidity ? info.myLiquidity : 0) : 0}
        onCancel={() => { setShowLiquidity(false) }}
        onDeposit={(value) => {
          setShowLiquidity(false);
          setShowDeposit(true);
        }}
        onWithdraw={() => {
          setShowLiquidity(false);
          setShowWithdraw(true);
        }} />
      <InputModal visible={showDeposit}
        onOk={(value) => {
          setLoading(true);
          sc.addLiquidity(value, undefined, props.selectedWallet, props.networkId).then((ret) => {
            message.success('Tx is sent: ' + ret)
            setShowDeposit(false);
          }).catch(ret => {
            message.error('Failed: ' + ret);
          }).finally(() => {
            setLoading(false);
          });
        }}
        onCancel={() => { setShowDeposit(false); }}
        loading={loading}
        title={intl.messages['depositLiquidity']}
        text={intl.messages['depositAmount']}
        symbol="WAN"
      />
      <InputModal visible={showWithdraw}
        withdraw={true}
        onOk={() => {
          setLoading(true);
          sc.withdraw(props.selectedWallet, props.networkId).then((ret) => {
            message.success('Tx is sent: ' + ret)
            setShowWithdraw(false);
          }).catch(ret => {
            message.error('Failed: ' + ret);
          }).finally(() => {
            setLoading(false);
          });
        }}
        onCancel={() => { setShowWithdraw(false); }}
        title={intl.messages['withdrawLiquidity']}
        text={intl.messages['withdrawAmount']}
        symbol="FAP"
      />
      <GameRuleModal visible={showGameRule} onCancel={() => { setShowGameRule(false) }} />
      <AssetsModal visible={showAssets} onCancel={() => { setShowAssets(false) }} balance={balance} />
      <BidModal visible={showBid} onCancel={() => { setShowBid(false) }} onOk={(value) => {
        setBidValue(value);
        setShowBid(false);
        setShowPayConfirm(true);
      }} />
      <PayConfirmModal visible={showPayConfirm} onCancel={() => { setShowPayConfirm(false) }} bidValue={bidValue} />
      <TopBar>
        <Logo>
          🏵
        </Logo>
        <Tab to="/" selected>{intl.messages['funnyAuction']}</Tab>
        <Tab to="/" onClick={() => { setShowLiquidity(true) }}>{intl.messages['liquidity']}</Tab>
        <Tab to="/" onClick={() => { setShowGameRule(true) }}>{intl.messages['gameRules']}</Tab>
        {
          rpc
            ? <>
              <Assets onClick={() => { setShowAssets(true) }}>{intl.messages['myAssets'] + ': ' + balance() + ' WAN'}</Assets>
              <WalletBt><WalletButton /></WalletBt>
            </>
            : null
        }
      </TopBar>
      <Title>{intl.messages['auctionBidFor']}</Title>
      <Coin amount={info ? info.goodsValue : '--'} />
      <Circle>
        <p style={{ fontSize: "58px" }}>100</p>
        <p style={{ fontSize: "20px" }}>Wan Coins</p>
      </Circle>
      <SmallTitle>{intl.messages['currentPrice'] + (info ? info.currentBidPrice : 0) + " WAN"}</SmallTitle>
      <MainButton onClick={() => { setShowBid(true) }}>{intl.messages['startGame']}</MainButton>
      <Title>{intl.messages['lastRoundRank']}</Title>
      <Header>
        <Cell>{intl.messages['rank']}</Cell>
        <Cell long>{intl.messages['address']}</Cell>
        <Cell>{intl.messages['status']}</Cell>
        <Cell>{intl.messages['pay']}</Cell>
        <Cell>{intl.messages['return']}</Cell>
      </Header>
      {
        rank.map((v, i) => {
          return (<TableRow key={i}>
            <Cell>{v.rank}</Cell>
            <Cell long>{v.address}</Cell>
            <Cell>{v.status}</Cell>
            <Cell>{v.pay}</Cell>
            <Cell>{v.return}</Cell>
          </TableRow>);
        })
      }
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

const LiquidityModal = (props) => {
  const intl = useIntl();

  return (
    <StyledModal
      visible={props.visible}
      onCancel={props.onCancel}
      footer={null}
    >
      <ModalTitle>{intl.messages['liquidity']}</ModalTitle>
      <ModalH1>{intl.messages['totalLiquidity']}:</ModalH1>
      <BigLabel>{props.totalLiquidity.toFixed(0)} WAN</BigLabel>
      <ModalH1>{intl.messages['myLiquidity']}:</ModalH1>
      <SmallLabel>{props.myLiquidity} FAP / {props.myLiquidity > 0 ? Number((props.myLiquidity * 100 / props.totalSupply).toFixed(2)) : 0}% / {props.myLiquidity > 0 ? (props.myLiquidity / props.totalSupply * props.totalLiquidity).toFixed(0) : 0} WAN</SmallLabel>
      <MainButton onClick={props.onDeposit}>{intl.messages['deposit']}</MainButton>
      <MainButton onClick={props.onWithdraw}>{intl.messages['withdraw']}</MainButton>
    </StyledModal>
  );
}

const InputModal = (props) => {
  const intl = useIntl();
  const [amount, setAmount] = useState();
  return (
    <StyledModal
      visible={props.visible}
      onCancel={props.onCancel}
      footer={null}
    >
      <ModalTitle>{props.title}</ModalTitle>
      {
        !props.withdraw
          ? <>
            <ModalH1>{props.text}:</ModalH1>
            <StyledInput suffix={props.symbol} value={amount} placeholder={'Input Amount Here'} onChange={(e) => { setAmount(e.target.value) }} />
          </>
          : null
      }

      <MainButton onClick={() => { props.onOk(amount) }}>{intl.messages['ok']}</MainButton>
      <MainButton onClick={props.onCancel}>{intl.messages['cancel']}</MainButton>
    </StyledModal>
  );
}

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
      <ModalH2>{intl.messages['gameRule8']}</ModalH2>
      <ModalH2>{intl.messages['gameRule9']}</ModalH2>
      <a href="https://github.com/wanswap" style={{ marginLeft: "20px" }}>Github</a>

      <MainButton onClick={props.onCancel} style={{ marginTop: "40px" }}>{intl.messages['ok']}</MainButton>
    </StyledModal>
  );
}

const AssetsModal = (props) => {
  const intl = useIntl();
  return (
    <StyledModal
      visible={props.visible}
      onCancel={props.onCancel}
      footer={null}
    >
      <ModalTitle>{intl.messages['myAssets']}</ModalTitle>
      <InALine>
        <SuperBigLabel>125</SuperBigLabel>
        <TextInside>WAN</TextInside>
      </InALine>
      <GridField>
        <Row gutter={[24, 24]}>
          <Col span={8}>{intl.messages['walletBalance']}</Col>
          <Col span={10}>{props.balance()} WAN</Col>
          <Col span={6}></Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={8}>{intl.messages['claimable']}</Col>
          <Col span={10}>15 WAN</Col>
          <Col span={6}>
            <SmallButton>{intl.messages['claim']}</SmallButton>
          </Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={8}>{intl.messages['lockedBalance']}</Col>
          <Col span={10}>20 WAN</Col>
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
      <ModalTitle>{intl.messages['myAssets']}</ModalTitle>
      <SmallTitle>{intl.messages['currentPrice'] + "0 WAN"}</SmallTitle>
      <GridField>
        <Row gutter={[24, 24]}>
          <Col span={4}>{intl.messages['bid']}</Col>
          <Col span={8}><SmallButton selected={select === "1"} onClick={() => { setSelect('1'); setValue(1); }}>+1 WAN</SmallButton></Col>
          <Col span={8}><SmallButton selected={select === "2"} onClick={() => { setSelect('2'); setValue(2); }}>+2 WAN</SmallButton></Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={4}></Col>
          <Col span={8}><SmallButton selected={select === "5"} onClick={() => { setSelect('5'); setValue(5); }}>+5 WAN</SmallButton></Col>
          <Col span={8}><SmallButton selected={select === "10"} onClick={() => { setSelect('10'); setValue(10); }}>+10 WAN</SmallButton></Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={4}></Col>
          <Col span={8}><SmallButton selected selected={select === "custom"} onClick={() => { setSelect('custom') }}>{intl.messages['custom']}</SmallButton></Col>
          <Col span={8}>
            {
              select === "custom"
                ? <SmallInput suffix={'WAN'} onChange={(e) => {
                  const v = e.target.value;
                  if (isNaN(v) || v < 0) {
                    return;
                  }

                  setValue(v);
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
  // console.log('bidValue', props.bidValue);
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
          <Col span={8}>100 WAN</Col>
          <Col span={6}></Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={10}>{intl.messages['payFromClaimable']}</Col>
          <Col span={8}>15 WAN</Col>
          <Col span={6}>
            <Tooltip title={intl.messages['payFromHelp1']}>
              <QuestionCircleOutlined />
            </Tooltip>
          </Col>
        </Row>
        <Row gutter={[24, 24]}>
          <Col span={10}>{intl.messages['payFromWallet']}</Col>
          <Col span={8}>20 WAN</Col>
          <Col span={6}>
            <Tooltip title={intl.messages['payFromHelp2']}>
              <QuestionCircleOutlined />
            </Tooltip>
          </Col>
        </Row>
      </GridField>
      <MainButton onClick={props.onCancel} style={{ marginTop: "40px" }}>{intl.messages['ok']}</MainButton>
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
          <span className='bottom'>WAN</span>
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
  background: linear-gradient(
    45deg,
    rgba(200, 255, 200, 1) 0%,
    rgba(158, 200, 155, 1) 50%,
    rgba(255, 203, 57, 1) 100%
  );
  background-size: 100% 100%;
  background-position: 50%;
  /* animation: ${RainbowLight} 20s linear infinite; */
  height: 100%;
  width: 100%;
  /* padding-bottom: 40px; */
`;

const TopBar = styled.div`
  width: 100%;
  height: 60px;
  background-color: #00000020;
  margin: 0px;
  display:flex;
  justify-content: start;
`;

const Logo = styled.div`
  padding: 6px;
  margin-right: 10px;
  font-size: 32px;
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
`;

const Assets = styled.div`
  cursor: pointer;
  border-radius: 25px;
  height: 36px;
  margin-left: auto;
  margin-right: 20px;
  /* border: 1px solid white; */
  margin-top: 12px;
  padding: 3px 20px 2px 20px;
  background-color: #489275;
  color: white;
  line-height: 30px;

`

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
  width: 200px;
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
  width: 200px;
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
  cursor: pointer;
  :hover{
    background-color: #eeffff;
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
    background:rgba(189 239 218 / 90%);
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
