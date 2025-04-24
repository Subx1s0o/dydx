import { Controller, Get, Param } from '@nestjs/common';
import { DydxService } from './dydx.service';

@Controller()
export class AppController {
  constructor(private readonly dydxService: DydxService) {}

  @Get('markets')
  async getMarkets() {
    try {
      const client = this.dydxService.getClient();
      const marketsResponse =
        await client.indexerClient.markets.getPerpetualMarkets();
      return { markets: marketsResponse.markets };
    } catch (error) {
      console.error('Failed to get markets:', error);
      return { error: 'Failed to get markets' };
    }
  }

  @Get('orderbook/:marketId')
  async getOrderBook(@Param('marketId') marketId: string) {
    try {
      const client = this.dydxService.getClient();
      const orderbook =
        await client.indexerClient.markets.getPerpetualMarketOrderbook(
          marketId,
        );
      return { orderbook };
    } catch (error) {
      console.error(`Failed to get orderbook for market ${marketId}:`, error);
      return { error: `Failed to get orderbook for market ${marketId}` };
    }
  }
}
