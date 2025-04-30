import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderBookModule } from './orderbook/orderbook.module';
import { OrdersModule } from './orders/orders.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { AccountModule } from './account/account.module';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      global: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    OrderBookModule,
    OrdersModule,
    InstrumentsModule,
    AccountModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        socket: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
