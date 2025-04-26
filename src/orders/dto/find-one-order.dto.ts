import { IsNotEmpty } from 'class-validator';

export class findOneOrderDto {
  @IsNotEmpty()
  order_id: string;
}
