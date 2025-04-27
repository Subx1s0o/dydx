import { Controller, Get, Post, Body } from '@nestjs/common';
import { AccountService } from './account.service';
import { WithdrawDto } from './dto/withdraw';
import { DepositDto } from './dto/deposit';

@Controller('v1/account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  async getAccount() {
    return this.accountService.getAccount();
  }

  @Get('positions')
  async getPositions() {
    return this.accountService.getPositions();
  }

  @Post('withdraw')
  async withdraw(@Body() withdrawDto: WithdrawDto) {
    return this.accountService.withdraw(
      withdrawDto.amount,
      withdrawDto.address,
    );
  }

  @Post('deposit')
  async deposit(@Body() depositDto: DepositDto) {
    return this.accountService.deposit(depositDto.amount);
  }
}
