import 'dotenv/config';

export const config = {
  instruments: ['MANAUSDT', 'BTCUSDT'],
  orderbook: {
    maxSize: 1000,
  },
  intervals: {
    reconnect: 3000,
    heartbeat: 15000,
    ping: 5000,
  },
  mnemonic: process.env.WALLET_MNEMONIC,
  apiKey: process.env.API_KEY,
};
