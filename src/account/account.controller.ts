import { Controller, Get } from '@nestjs/common';
import { AccountService } from './account.service';

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
}
