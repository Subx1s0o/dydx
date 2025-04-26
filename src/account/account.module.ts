import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { DydxModule } from 'src/dydx/dydx.module';

@Module({
  imports: [DydxModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
