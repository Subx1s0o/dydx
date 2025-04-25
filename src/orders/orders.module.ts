import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DydxModule } from 'src/dydx/dydx.module';

@Module({
  imports: [DydxModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
