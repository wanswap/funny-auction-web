# Funny-Auction

Run:
```
$ npm i
$ npm run start

```

# Auction Rule

Auction Rules 
1) The top 1 bidder is the winner of a round. He pays the amount of $WASP to smart contract, and gets back the $WAN rewards. His $WASP will be burnt by the smart contract. 

2) The other bidders will get back their bidding amount of $WASP back with no loss after each round. 

3) In each round, if there’s no higher bid within XXX blocks (roughly XXX minutes/hours), the current highest bidder shall win the rewards of this round. 

4) Between each round, there’s a XXX (time) of cool down before next round of auction begins. 

5) The bidded $WASP tokens are temporarily stored in the smart contract and can be claimed back at any time. 

6) Every new round of auction will settle last round’s $WAN rewards.

# Smart Contract

https://github.com/wanswap/funny-auction-contracts

## Mainnet Depoly

contract address:    0xc41FC67fC40Fe08446159c54C11a4455d0c56be0
