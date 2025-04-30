import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { toUnixTimestamp } from 'utils/utils';
import { OrderStatus, OrderType, OrderSide } from '@dydxprotocol/v4-client-js';

export class GetOrdersDto {
  @IsOptional()
  @IsString()
  instrument?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(OrderSide)
  side?: OrderSide;

  @IsOptional()
  @IsEnum(OrderType)
  type: OrderType;

  @IsOptional()
  @Transform(({ value }) => toUnixTimestamp(value))
  @IsNumber()
  start?: number;

  @IsOptional()
  @Transform(({ value }) => toUnixTimestamp(value))
  @IsNumber()
  end?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  returnLasts?: string;
}
