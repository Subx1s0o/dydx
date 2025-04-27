import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateIf,
  IsNumber,
} from 'class-validator';

import {
  OrderSide,
  OrderType,
  OrderTimeInForce,
} from '@dydxprotocol/v4-client-js';

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
  @IsIn(Object.keys(OrderTimeInForce))
  time_in_force?: OrderTimeInForce;

  @IsBoolean()
  @ValidateIf((o) => o.time_in_force == OrderTimeInForce.GTT)
  post_only: boolean;

  @IsBoolean()
  @ValidateIf((o) => o.time_in_force == OrderTimeInForce.IOC)
  reduce_only: boolean;

  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => o.time_in_force == OrderTimeInForce.GTT)
  good_til_time_value?: number;

  @ValidateIf((o) => o.type == OrderType.LIMIT)
  @IsOptional()
  limit_price?: number;
}
