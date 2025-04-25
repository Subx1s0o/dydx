import { IsNotEmpty, IsOptional } from 'class-validator';

export class GetOrderBookDto {
  @IsNotEmpty()
  instrument: string;

  @IsOptional()
  limit: number = 25;
}
