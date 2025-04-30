import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DydxService } from '../dydx/dydx.service';
import { CompositeClient } from '@dydxprotocol/v4-client-js';
import { formatFromDydxInstrument } from 'utils/utils';
import { Instrument } from './entities/instrument';
@Injectable()
export class InstrumentsService implements OnModuleInit {
  private client: CompositeClient;

  constructor(
    private readonly dydxService: DydxService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  onModuleInit() {
    this.client = this.dydxService.getRestClient();
  }

  async getInstruments(): Promise<Instrument[]> {
    const cachedInstruments = await this.cacheManager.get('instruments');

    if (cachedInstruments) {
      return cachedInstruments as Instrument[];
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
        dydx_instrument: instrumentId,
      });
    }

    await this.cacheManager.set('instruments', formattedInstruments, 2629743);
    return formattedInstruments;
  }
}
