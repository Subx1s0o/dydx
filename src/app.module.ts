import { Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { DydxService } from './dydx.service';
import { AppController } from './app.controller';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppGateway, DydxService],
})
export class AppModule {}
