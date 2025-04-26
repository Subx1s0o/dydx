import 'dotenv/config';

export const config = {
  instruments: ['MANA/USDT', 'BTC/USDT'],
  orderbook: {
    maxSize: 1000,
  },
  intervals: {
    reconnect: 3000,
    heartbeat: 15000,
    ping: 5000,
  },
  mnemonic: process.env.WALLET_MNEMONIC,
};
