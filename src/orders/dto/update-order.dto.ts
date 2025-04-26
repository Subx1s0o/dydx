import { IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateOrderDto {
  @IsString()
  client_order_id: string;

  @IsString()
  @IsOptional()
  instrument?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  limit_price?: number;
}
