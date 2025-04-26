import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { OrderBookModule } from './orderbook/orderbook.module';
import { OrdersModule } from './orders/orders.module';
import { InstrumentsModule } from './instruments/instruments.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      global: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    OrderBookModule,
    OrdersModule,
    InstrumentsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
