import { Controller, Get, Inject } from '@nestjs/common';
import { DydxService } from '../dydx/dydx.service';
import { CompositeClient } from '@dydxprotocol/v4-client-js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { formatFromDydxInstrument } from 'utils/utils';
@Controller('v1/instruments')
export class InstrumentsController {
  private client: CompositeClient;

  constructor(
    private readonly dydxService: DydxService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  onApplicationBootstrap() {
    this.client = this.dydxService.getRestClient();
  }

  @Get()
  async getInstruments() {
    const cachedInstruments = await this.cacheManager.get('instruments');

    if (cachedInstruments) {
      return cachedInstruments;
    }

    const { markets } =
      await this.client.indexerClient.markets.getPerpetualMarkets();

    const formattedInstruments = [];

    for (const instrumentId in markets) {
      const market = markets[instrumentId];
      formattedInstruments.push({
        base_currency: instrumentId.replace(/-USD$/, ''),
        quote_currency: 'USDT',
        instrument_id: market.clobPairId,
        instrument_name: formatFromDydxInstrument(instrumentId),
        max_quantity: market.openInterestUpperCap,
        min_quantity: market.stepSize,
        price_decimals: Math.abs(market.atomicResolution).toString(),
        quantity_decimals: Math.abs(
          market.quantumConversionExponent,
        ).toString(),
        quantity_increment: market.stepSize,
      });
    }

    await this.cacheManager.set('instruments', formattedInstruments);
    return formattedInstruments;
  }
}
