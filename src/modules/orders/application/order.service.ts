import { Injectable } from '@nestjs/common';
import Opossum from 'opossum';
import { OrderCancelledEvent, OrderConfirmedEvent, OrderCreatedEvent } from '../../../core/events/events';
import { retry } from '../../../core/retry.helper';
import { DlqService } from '../../dlq/domain/dlq.service';
import { Order, OrderStatus } from '../domain/order.entity';
import { EventBusService } from '../../../core/event-bus.service';

@Injectable()
export class OrderService {
  private orders: Map<string, Order> = new Map();

  constructor(
    private readonly eventBus: EventBusService
  ) {

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
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }
    order.status = 'CONFIRMED';
    console.log(`[OrderService] Order ${orderId} confirmed.`);
    this.eventBus.publish(new OrderConfirmedEvent({ orderId }));
  }

  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }
    order.status = 'CANCELLED';
    console.log(`[OrderService] Order ${orderId} cancelled. Reason: ${reason || 'Not specified'}`);
    this.eventBus.publish(new OrderCancelledEvent({ orderId, reason }));
  }

  getOrderById(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }
}