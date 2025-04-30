import { Module } from '@nestjs/common';
import { InstrumentsController } from './instruments.controller';
import { InstrumentsService } from './instruments.service';
import { DydxModule } from 'src/dydx/dydx.module';

@Module({
  imports: [DydxModule],
  controllers: [InstrumentsController],
  providers: [InstrumentsService],
  exports: [InstrumentsService],
})
export class InstrumentsModule {}
