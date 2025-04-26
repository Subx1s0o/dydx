import { IsString } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  order_id: string;
}
