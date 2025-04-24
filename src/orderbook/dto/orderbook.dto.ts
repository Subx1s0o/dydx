export class OrderbookDto {
  instrument: string;
  ts: string;
  asks: OrderbookItemDto[];
  bids: OrderbookItemDto[];
  checksum: number;
}

export interface OrderbookItemDto {
  price: number;
  qty: number;
}
