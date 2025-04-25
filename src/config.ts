export const config = {
  instruments: ['MANA/USDT', 'BTC/USDT'], // TODO
  orderbook: {
    maxSize: 1000,
  },
  intervals: {
    reconnect: 3000,
    heartbeat: 15000,
    ping: 5000,
  },
};
