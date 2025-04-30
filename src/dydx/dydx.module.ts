import { Module } from '@nestjs/common';
import { DydxService } from './dydx.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [DydxService],
  exports: [DydxService],
})
export class DydxModule {}
