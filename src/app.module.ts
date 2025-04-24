import { Module } from '@nestjs/common';

import { AppGateway } from './app.gateway';
import { DydxService } from './dydx.service';
import { AppController } from './app.controller';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [AppController],
  providers: [AppGateway, DydxService],
})
export class AppModule {}
