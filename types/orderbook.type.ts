export interface OrderBook {
  asks: Order[];
  bids: Order[];
}

export interface Order {
  price: string;
  qty: string;
}
