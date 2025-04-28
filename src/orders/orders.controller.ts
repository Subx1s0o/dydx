import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { findOneOrderDto } from './dto/find-one-order.dto';
import { GetOrdersDto } from './dto/find-all-orders.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

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

  @Put()
  update(@Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.updateOrder(updateOrderDto);
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
