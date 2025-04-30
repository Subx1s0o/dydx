import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
} from 'class-validator';

import {
  OrderSide,
  OrderType,
  OrderTimeInForce,
} from '@dydxprotocol/v4-client-js';

import { Transform } from 'class-transformer';

export class CreateOrderDto {
  @IsNotEmpty()
  instrument: string;

  @IsOptional()
  client_order_id?: string;

  @IsNotEmpty()
  quantity: number;

  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn([...Object.keys(OrderTimeInForce), 'GTD'])
  time_in_force?: OrderTimeInForce | 'GTD';

  @ValidateIf((o) => o.type == OrderType.LIMIT)
  @IsOptional()
  limit_price?: number;
}
