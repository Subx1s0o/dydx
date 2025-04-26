import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateIf,
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

  @IsOptional()
  @IsBoolean()
  post_only?: boolean;

  @IsOptional()
  @IsBoolean()
  good_til_time_value?: string;

  @ValidateIf((o) => o.type == OrderType.LIMIT)
  @IsOptional()
  limit_price?: number;
}
