import { Injectable, NotFoundException } from '@nestjs/common';
import { GetOrderBookDto } from './dto/get-orderbook.dto';
import { config } from 'src/config';
import { OrderbookDto } from './dto/orderbook.dto';
import { DydxService } from '../dydx/dydx.service';
import { OnEvent } from '@nestjs/event-emitter';
import { Order } from 'types/orderbook.type';
import * as crc32 from 'crc-32';

@Injectable()
export class OrderBookService {
  private orderbooks = new Map();

  constructor(private readonly dydxService: DydxService) {}

  @OnEvent('websocketConnected')
  async handleWebSocketConnected() {
    for (const instrument of config.instruments) {
      this.dydxService.subcribeTo('v4_orderbook', { id: instrument });
    }
  }

  @OnEvent('websocketDisconnected')
  handleWebSocketDisconnect() {
    console.log('Clearing all orderbook data due to WebSocket disconnect');
    this.orderbooks.clear();
  }

  @OnEvent('handleOrderbookMessage')
  async handleOrderbookMessage(instrument: string, data: any) {
    let orderbook = this.orderbooks.get(instrument);

    if (!orderbook) {
      orderbook = new OrderbookDto();
      orderbook.instrument = instrument;
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

    this.orderbooks.set(instrument, orderbook);
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

  private computeChecksum(bids: Order[], asks: Order[]): number {
    const depth = 10;

    const formatValue = (value: string): string => {
      return value.replace('.', '').replace(/^0+/, '');
    };

    const formatLevels = (levels: Order[]): string[] =>
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
