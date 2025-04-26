import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { findOneOrderDto } from './dto/find-one-order.dto';
import { DydxService } from 'src/dydx/dydx.service';
import {
  CompositeClient,
  OrderFlags,
  SubaccountInfo,
} from '@dydxprotocol/v4-client-js';
import {
  formatFromDydxInstrument,
  formatToDydxInstrument,
  parseOrderFlags,
} from 'utils/utils';
import { GetOrdersDto } from './dto/find-all-orders.dto';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  private client: CompositeClient;
  private subaccount: SubaccountInfo;

  constructor(private readonly dydxService: DydxService) {}

  onApplicationBootstrap() {
    this.client = this.dydxService.getRestClient();
    this.subaccount = this.dydxService.getSubaccount();
  }

  async createOrder(data: CreateOrderDto) {
    const dydxInstrument = formatToDydxInstrument(data.instrument);

    let goodTilTimeInSeconds = undefined;

    if (data.time_in_force === 'GTT') {
      if (!data.good_til_time_value) {
        throw new BadRequestException('Good till time value is required');
      }

      goodTilTimeInSeconds = Math.floor(
        new Date(data.good_til_time_value).getTime() / 1000,
      );
    }

    try {
      await this.client.placeOrder(
        this.subaccount, // SUBACCOUNT
        dydxInstrument, // INSTRUMENT
        data.type, // ORDER TYPE
        data.side, // ORDER SIDE
        data.limit_price ? data.limit_price : 0, // LIMIT PRICE
        data.quantity, // QUANTITY
        +data.client_order_id, // CLIENT ORDER ID
        data.time_in_force, // TIME IN FORCE
        goodTilTimeInSeconds, // GOOD TILL TIME IN SECONDS
        undefined, // EXECUTION
        data.post_only, // POST ONLY
      );
      return { message: 'Order created' };
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Error creating order: ' + error.message);
    }
  }

  async cancelOrder(data: CancelOrderDto) {
    const order = await this.getRawOrder(data.order_id); // ADD CACHING
    if (!order || order.status !== 'OPEN') {
      throw new NotFoundException(
        !order
          ? `Order ${data.order_id} not found`
          : `Order ${data.order_id} is already ${order.status}`,
      );
    }

    // Flags mapping
    const flags = +order.orderFlags as OrderFlags;

    // Get network time
    const timeResp = await this.client.indexerClient.utility.getTime();

    // Get current time in seconds
    const nowSec = Math.floor(timeResp.epoch / 1000);

    // Prepare Good Till Time in seconds
    let goodTilBlock = 0;
    let goodTilTimeInSeconds = 0;

    if (flags === OrderFlags.SHORT_TERM) {
      // For short term orders use TTL in blocks
      const { height } = await this.client.indexerClient.utility.getHeight();
      goodTilBlock = height + 10; // <= ShortBlockWindow (current + 10 blocks), max +20 blocks
    } else {
      // For LONG_TERM/CONDITIONAL use TTL in time
      const BUFFER_SEC = 30;
      goodTilTimeInSeconds = nowSec + BUFFER_SEC;
    }

    try {
      return await this.client.cancelOrder(
        this.subaccount, // SUBACCOUNT
        Number(order.clientId), // CLIENT ORDER ID
        flags, // ORDER FLAG (SHORT_TERM, LONG_TERM, CONDITIONAL)
        order.ticker, // INSTRUMENT
        goodTilBlock, // GOOD TILL BLOCK
        goodTilTimeInSeconds, // GOOD TILL TIME IN SECONDS
      );
    } catch (err) {
      throw new NotFoundException(`Cancel order failed: ${err.message}`);
    }
  }

  async getOrders(data: GetOrdersDto) {
    let instrument = undefined;
    if (data.instrument) {
      instrument = formatToDydxInstrument(data.instrument);
    }

    const orders = await this.client.indexerClient.account.getSubaccountOrders(
      this.subaccount.address, // ADDRESS
      this.subaccount.subaccountNumber, // SUBACCOUNT NUMBER
      instrument, // INSTRUMENT
      undefined, // INSTRUMENT TYPE - only "PERPETUAL"
      data.side, // ORDER SIDE
      data.status, // ORDER STATUS
      data.type, // ORDER TYPE
      data.limit, // LIMIT
    );

    let result = orders;

    if (data.start || data.end) {
      result = orders.filter((order) => {
        const updatedAtTimestamp = new Date(order.updatedAt).getTime() / 1000;

        if (data.start && data.end) {
          return (
            updatedAtTimestamp >= data.start && updatedAtTimestamp <= data.end
          );
        } else if (data.start) {
          return updatedAtTimestamp >= data.start;
        } else if (data.end) {
          return updatedAtTimestamp <= data.end;
        }

        return true;
      });
    }

    const customOrders: Order[] = [];

    for (const order of result) {
      const customOrder = this.transformOrder(order);

      customOrders.push(customOrder);
    }

    customOrders.sort((a, b) => {
      const aTime = new Date(a.updated_at).getTime();
      const bTime = new Date(b.updated_at).getTime();
      return bTime - aTime;
    });

    return customOrders;
  }

  async findOne(data: findOneOrderDto) {
    const order = await this.getRawOrder(data.order_id);

    return this.transformOrder(order);
  }

  private async getRawOrder(orderId: string) {
    return await this.client.indexerClient.account.getOrder(orderId);
  }

  private transformOrder(order: any): Order {
    const customOrder = new Order();
    customOrder.order_id = order.id;
    customOrder.client_order_id = order.clientId;
    customOrder.type = order.type;
    customOrder.status = order.status;
    customOrder.side = order.side;
    customOrder.instrument = formatFromDydxInstrument(order.ticker);
    customOrder.quantity = order.size;
    customOrder.price = order.limitPrice;
    customOrder.time_in_force = order.timeInForce;
    customOrder.updated_at = order.updatedAt;

    const { orderFlags, goodTilTimeInSeconds } = parseOrderFlags(
      order.orderFlags,
    );
    customOrder.order_flags = orderFlags;
    customOrder.good_til_time_in_seconds = goodTilTimeInSeconds;

    return customOrder;
  }
}
