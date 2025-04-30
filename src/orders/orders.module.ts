import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DydxModule } from 'src/dydx/dydx.module';
import { ApiGuard } from 'src/api.guard';
@Module({
  imports: [DydxModule],
  controllers: [OrdersController],
  providers: [OrdersService, ApiGuard],
})
export class OrdersModule {}
