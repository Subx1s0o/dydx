import { Controller, Get } from '@nestjs/common';
import { InstrumentsService } from './instruments.service';

@Controller('v1/instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Get()
  async getInstruments() {
    return this.instrumentsService.getInstruments();
  }
}
