import {
  BadRequestException,
  Inject,
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
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class OrdersService {
  private client: CompositeClient;
  private subaccount: SubaccountInfo;

  constructor(
    private readonly dydxService: DydxService,
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
  ) {}

  onApplicationBootstrap() {
    this.client = this.dydxService.getRestClient();
    this.subaccount = this.dydxService.getSubaccount();
  }

  async createOrder(data: CreateOrderDto) {
    const dydxInstrument = formatToDydxInstrument(data.instrument);

    if (
      data.type === 'LIMIT' &&
      data.time_in_force === 'GTT' &&
      !data.post_only
    ) {
      throw new BadRequestException(
        'postOnly must be set if order type is LIMIT and timeInForce is GTT',
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
        data.good_til_time_value, // GOOD TILL TIME IN SECONDS
        undefined, // EXECUTION
        data.post_only || undefined, // POST ONLY
        data.reduce_only || undefined, // REDUCE ONLY
      );
      return { message: 'Order created' };
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Error creating order: ' + error.message);
    }
  }

  async cancelOrder(data: CancelOrderDto) {
    const order = await this.getRawOrder(data.order_id);
    if (!order || order.status !== 'OPEN') {
      throw new NotFoundException(
        !order
          ? `Order ${data.order_id} not found`
          : `Order ${data.order_id} is already ${order.status}`,
      );
    }

    const flags = +order.orderFlags as OrderFlags;

    const timeResp = await this.client.indexerClient.utility.getTime();

    const nowSec = Math.floor(timeResp.epoch / 1000);

    let goodTilBlock = 0;
    let goodTilTimeInSeconds = 0;

    if (flags === OrderFlags.SHORT_TERM) {
      const { height } = await this.client.indexerClient.utility.getHeight();
      goodTilBlock = height + 10;
    } else {
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
    const cachedOrder = await this.cacheService.get(orderId);
    if (cachedOrder) {
      return cachedOrder;
    }
    const order = await this.client.indexerClient.account.getOrder(orderId);
    await this.cacheService.set(orderId, order);
    return order;
  }

  private transformOrder(order: any): Order {
    console.log(order);
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

    const orderFlags = parseOrderFlags(order.orderFlags);
    customOrder.order_flags = orderFlags;

    return customOrder;
  }
}
