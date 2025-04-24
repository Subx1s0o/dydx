import { Module } from '@nestjs/common';
import { OrderBookController } from './orderbook.controller';
import { OrderBookService } from './orderbook.service';
import { DydxModule } from '../dydx/dydx.module';

@Module({
  imports: [DydxModule],
  controllers: [OrderBookController],
  providers: [OrderBookService],
})
export class OrderBookModule {}
