import { Injectable, NotFoundException } from '@nestjs/common';
import { GetOrderBookDto } from './dto/get-orderbook.dto';
import { config } from 'src/config';
import { OrderbookDto } from './dto/orderbook.dto';
import { DydxService } from '../dydx/dydx.service';
import { OnEvent } from '@nestjs/event-emitter';
import * as crc32 from 'crc-32';
import { findMatchingInstruments, InstrumentMapping } from 'utils/utils';

@Injectable()
export class OrderBookService {
  private orderbooks = new Map<string, OrderbookDto>();
  private instrumentMappings = new Map<string, InstrumentMapping>();

  constructor(private readonly dydxService: DydxService) {}

  @OnEvent('websocketConnected')
  async handleWebSocketConnected() {
    const res = await this.dydxService
      .getRestClient()
      .indexerClient.markets.getPerpetualMarkets();

    const availableInstruments = findMatchingInstruments(res.markets);

    availableInstruments.forEach((instrument) => {
      // Store mappings to lookup by original format later
      this.instrumentMappings.set(instrument.original, instrument);

      this.dydxService.subcribeTo('v4_orderbook', { id: instrument.dydx });
    });
  }

  @OnEvent('websocketDisconnected')
  handleWebSocketDisconnect() {
    console.log('Clearing all orderbook data due to WebSocket disconnect');
    this.orderbooks.clear();
  }

  @OnEvent('handleOrderbookMessage')
  async handleOrderbookMessage(instrument: string, data: any) {
    const mapping = Array.from(this.instrumentMappings.values()).find(
      (mapping) => mapping.dydx === instrument,
    );

    if (!mapping) {
      console.warn(`No mapping found for instrument: ${instrument}`);
      return;
    }

    let orderbook = this.orderbooks.get(mapping.original);

    if (!orderbook) {
      orderbook = new OrderbookDto();
      orderbook.instrument = mapping.original;
      orderbook.asks = [];
      orderbook.bids = [];
      orderbook.ts = '';
      orderbook.checksum = 0;
    }

    if (data.contents && data.contents.asks) {
      this.mergeOrderbookData(orderbook.asks, data.contents.asks);
      this.limitOrderbookSize(orderbook.asks);
    }

    if (data.contents && data.contents.bids) {
      this.mergeOrderbookData(orderbook.bids, data.contents.bids);
      this.limitOrderbookSize(orderbook.bids);
    }

    this.orderbooks.set(mapping.original, orderbook);
  }

  private limitOrderbookSize(data: any[]) {
    if (data.length > config.orderbook.maxSize) {
      data.length = config.orderbook.maxSize;
    }
  }

  private mergeOrderbookData(existingData: any[], newData: any[]) {
    if (!Array.isArray(newData)) return;

    for (const item of newData) {
      const normalizedItem = {
        price: item[0],
        qty: item[1],
      };

      existingData.unshift(normalizedItem);
    }
  }

  private computeChecksum(bids: any[], asks: any[]): number {
    const depth = 10;

    const formatValue = (value: string | number): string => {
      return String(value).replace('.', '').replace(/^0+/, '');
    };

    const formatLevels = (levels: any[]): string[] =>
      levels.slice(0, depth).map((level) => {
        const price = formatValue(level.price);
        const qty = formatValue(level.qty);
        return price + qty;
      });

    const askParts = formatLevels(asks);
    const bidParts = formatLevels(bids);

    const combined = askParts.concat(bidParts).join('');
    return crc32.str(combined) >>> 0;
  }

  async getOrderbook({ instrument, limit }: GetOrderBookDto) {
    const orderbook = this.orderbooks.get(instrument);

    if (!orderbook) {
      throw new NotFoundException(
        `Orderbook for instrument: ${instrument} was not found`,
      );
    }

    const result = { ...orderbook };
    result.checksum = this.computeChecksum(result.bids, result.asks);

    result.asks = result.asks.slice(0, limit);
    result.bids = result.bids.slice(0, limit);
    result.ts = new Date().toISOString();

    return result;
  }
}
