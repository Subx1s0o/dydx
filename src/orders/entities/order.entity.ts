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
  limit_price?: string;
  order_flags?: string;
  quantity: string;
  executed_quantity: string;
  updated_at?: string;
}
