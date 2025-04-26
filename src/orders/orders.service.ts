import { Injectable, NotFoundException } from '@nestjs/common';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { findOneOrderDto } from './dto/find-one-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { DydxService } from 'src/dydx/dydx.service';
import { CompositeClient, SubaccountInfo } from '@dydxprotocol/v4-client-js';
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

    const postOnly =
      data.type === 'LIMIT' && data.time_in_force === 'GTT' ? true : undefined;

    const goodTilTimeInSeconds =
      data.time_in_force === 'GTT' ? 86400 : undefined;

    const clientOrderId = data.client_order_id
      ? +data.client_order_id
      : Math.floor(Math.random() * 1000000) + Date.now();

    try {
      return await this.client.placeOrder(
        this.subaccount,
        dydxInstrument,
        data.type,
        data.side,
        data.limit_price ? data.limit_price : 0,
        data.quantity,
        clientOrderId,
        data.time_in_force,
        goodTilTimeInSeconds,
        undefined,
        postOnly,
      );
    } catch (error) {
      console.log('Error creating order', error);
    }
  }

  async updateOrder(data: UpdateOrderDto) {
    // Support only by placing a new order with the same client_order_id so API replace the data
  }

  async cancelOrder(data: CancelOrderDto) {
    try {
      const order = await this.getRawOrder(data.order_id);

      await this.client.cancelOrder(
        this.subaccount,
        order.clientId,
        order.orderFlags,
        order.ticker,
        0,
        order.goodTilTimeInSeconds,
      );
    } catch (error) {
      throw new NotFoundException(error.message);
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

    result.sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

    const customOrders: Order[] = [];

    for (const order of result) {
      const customOrder = this.transformOrder(order);

      customOrders.push(customOrder);
    }
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
