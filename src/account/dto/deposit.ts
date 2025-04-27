import { IsNotEmpty, IsString } from 'class-validator';

export class DepositDto {
  @IsNotEmpty()
  @IsString()
  amount: string;
}
