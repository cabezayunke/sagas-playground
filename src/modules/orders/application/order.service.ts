import { Injectable } from '@nestjs/common';
import { OrderCancelledEvent, OrderConfirmedEvent, OrderCreatedEvent } from '../../core/events/events';
import { Order, OrderStatus } from '../domain/order.entity';
import { EventBusService } from '../../core/event-bus.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrderService {
  private orders: Map<string, Order> = new Map();

  constructor(
    private readonly eventBus: EventBusService,
    private readonly configService: ConfigService
  ) {

  }

  private logOrders() {
    console.log(`{
      Orders cancelled: ${Array.from(this.orders.values()).filter(order => order.status === 'CANCELLED').length}
      Orders confirmed: ${Array.from(this.orders.values()).filter(order => order.status === 'CONFIRMED').length}
      Orders pending: ${Array.from(this.orders.values()).filter(order => order.status === 'PENDING').length}
    }`);
  }

  createOrder(orderId: string, items: any[]): Order {
    const newOrder: Order = {
      orderId,
      items,
      status: 'PENDING',
    };
    this.orders.set(orderId, newOrder);
    console.log(`[OrderService] Created order ${orderId} with status PENDING.`);
    this.eventBus.publish(new OrderCreatedEvent({ orderId, items }));
    return newOrder;
  }

  async confirmOrder(orderId: string): Promise<void> {
    this.logOrders()

    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    // force random errors
    // CAREFUL: this is unpredictable and breaks tests
    if (Math.random() < this.configService.get<number>('CIRCUIT_BREAKER_FAILURE_RATE', 0)) {
      throw new Error(`Random failure when updating order ${orderId}`);
    }

    order.status = 'CONFIRMED';
    console.log(`[OrderService] Order ${orderId} confirmed.`);
    this.eventBus.publish(new OrderConfirmedEvent({ orderId }));

  }

  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    this.logOrders()

    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    // force random errors
    // CAREFUL: this is unpredictable and breaks tests
    if (Math.random() < this.configService.get<number>('CIRCUIT_BREAKER_FAILURE_RATE', 0)) {
      throw new Error(`Random failure when updating order ${orderId}`);
    }

    order.status = 'CANCELLED';
    console.log(`[OrderService] Order ${orderId} cancelled. Reason: ${reason || 'Not specified'}`);
    this.eventBus.publish(new OrderCancelledEvent({ orderId, reason }));

  }

  getOrderById(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }
}