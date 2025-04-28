import {
  OrderTimeInForce,
  OrderType,
  OrderSide,
  OrderStatus,
} from '@dydxprotocol/v4-client-js';

export class Order {
  order_id: string;
  client_order_id: string;
  instrument?: string;
  time_in_force?: OrderTimeInForce | string;
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  price?: string;
  order_flags?: string;
  quantity?: string;
  updated_at?: string;
}
