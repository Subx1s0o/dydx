import { Controller, Get } from '@nestjs/common';
import { DydxService } from './dydx/dydx.service';

@Controller()
export class AppController {
  constructor(private readonly dydxService: DydxService) {}

  @Get('markets')
  async getMarkets() {
    try {
      const client = this.dydxService.getRestClient();
      const marketsResponse =
        await client.indexerClient.markets.getPerpetualMarkets();
      return { markets: marketsResponse.markets };
    } catch (error) {
      console.error('Failed to get markets:', error);
      return { error: 'Failed to get markets' };
    }
  }
}
