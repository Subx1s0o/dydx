import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { findOneOrderDto } from './dto/find-one-order.dto';
import { GetOrdersDto } from './dto/find-all-orders.dto';

@Controller('v1/order')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Body() data: CreateOrderDto) {
    return this.ordersService.createOrder(data);
  }

  @Delete()
  cancel(@Body() cancelOrderInputDto: CancelOrderDto) {
    return this.ordersService.cancelOrder(cancelOrderInputDto);
  }

  @Get()
  findOne(@Query() data: findOneOrderDto) {
    return this.ordersService.findOne(data);
  }

  @Get('all')
  findAll(@Query() dto: GetOrdersDto) {
    return this.ordersService.getOrders(dto);
  }
}
