import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { GetOrderBookDto } from './dto/get-orderbook.dto';
import { config } from 'src/config';
import { OrderbookDto } from './dto/orderbook.dto';
import { DydxService } from '../dydx/dydx.service';
import * as crc32 from 'crc-32';
import { InstrumentMapping } from 'utils/utils';
import { RedisService } from '../redis/redis.service';
import { InstrumentsService } from 'src/instruments/instruments.service';
import { RedisEvent, RedisMessage } from 'src/redis/event.enum';
import { DydxChannel } from 'src/dydx/dydx.enum';

@Injectable()
export class OrderBookService implements OnModuleInit {
  private orderbooks = new Map<string, OrderbookDto>();
  private instrumentMappings = new Map<string, InstrumentMapping>();
  private dydxToOriginalMap = new Map<string, string>();

  constructor(
    private readonly dydxService: DydxService,
    private readonly redisService: RedisService,
    private readonly instrumentsService: InstrumentsService,
  ) {}

  async onModuleInit() {
    await this.redisService.subscribe(RedisEvent.WEBSOCKET, (message) => {
      if (message.event === RedisMessage.CONNECTED) {
        this.handleWebSocketConnected();
      } else if (message.event === RedisMessage.DISCONNECTED) {
        this.handleWebSocketDisconnect();
      }
    });

    await this.redisService.subscribe(RedisEvent.ORDERBOOK, (message) => {
      this.handleOrderbookMessage(message.id, message.data);
    });
  }

  async handleWebSocketConnected() {
    const allInstruments = await this.instrumentsService.getInstruments();

    this.instrumentMappings.clear();
    this.dydxToOriginalMap.clear();

    const configuredInstruments = config.instruments;

    for (const configInstrument of configuredInstruments) {
      const matchedInstrument = allInstruments.find(
        (inst) => inst.instrument_name === configInstrument,
      );

      if (matchedInstrument && matchedInstrument.dydx_instrument) {
        const mapping = {
          original: configInstrument,
          dydx: matchedInstrument.dydx_instrument,
        };

        this.instrumentMappings.set(configInstrument, mapping);
        this.dydxToOriginalMap.set(
          matchedInstrument.dydx_instrument,
          configInstrument,
        );

        this.dydxService.subcribeTo(DydxChannel.ORDERBOOK, {
          id: matchedInstrument.dydx_instrument,
        });
      } else {
        console.warn(
          `Could not find mapping for configured instrument: ${configInstrument}`,
        );
      }
    }
  }

  handleWebSocketDisconnect() {
    console.log('Clearing all orderbook data due to WebSocket disconnect');
    this.orderbooks.clear();
  }

  async handleOrderbookMessage(instrument: string, data: any) {
    const originalInstrument = this.dydxToOriginalMap.get(instrument);

    if (!originalInstrument) {
      console.warn(`No mapping found for instrument: ${instrument}`);
      return;
    }

    const mapping = this.instrumentMappings.get(originalInstrument);

    if (!mapping) {
      console.warn(
        `No mapping found for original instrument: ${originalInstrument}`,
      );
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
