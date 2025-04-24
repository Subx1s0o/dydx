import { Controller, Get, Query } from '@nestjs/common';
import { OrderBookService } from './orderbook.service';
import { GetOrderBookDto } from './dto/get-orderbook.dto';

@Controller()
export class OrderBookController {
  constructor(private readonly orderBookService: OrderBookService) {}

  @Get('v1/orderbook')
  findOne(@Query() dto: GetOrderBookDto) {
    return this.orderBookService.getOrderbook(dto);
  }
}
