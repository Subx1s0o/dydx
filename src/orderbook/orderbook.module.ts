import { Module } from '@nestjs/common';
import { OrderBookController } from './orderbook.controller';
import { OrderBookService } from './orderbook.service';
import { DydxModule } from '../dydx/dydx.module';
import { RedisModule } from '../redis/redis.module';
import { InstrumentsModule } from 'src/instruments/instruments.module';

@Module({
  imports: [DydxModule, RedisModule, InstrumentsModule],
  controllers: [OrderBookController],
  providers: [OrderBookService],
})
export class OrderBookModule {}
