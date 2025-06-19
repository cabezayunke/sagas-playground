import { Controller, Post, Body } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './create-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    const order = this.orderService.createOrder(dto.orderId, dto.items);
    return order;
  }
}