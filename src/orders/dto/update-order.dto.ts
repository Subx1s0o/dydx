import { IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateOrderDto {
  @IsString()
  orderId: string;

  @IsString()
  instrument: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  limit_price?: number;
}
