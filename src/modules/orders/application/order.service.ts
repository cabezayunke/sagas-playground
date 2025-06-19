import { Injectable } from '@nestjs/common';
import Opossum from 'opossum';
import { OrderConfirmedEvent, OrderCreatedEvent } from '../../../core/events/events';
import { retry } from '../../../common/retry.helper';
import { DlqService } from '../../dlq/domain/dlq.service';
import { Order, OrderStatus } from '../domain/order.entity';
import { EventBusService } from '../../../common/event-bus.service';

@Injectable()
export class OrderService {
  private orders: Map<string, Order> = new Map();
  // NOTE: the circuit breaker needs to know the function parameters types
  private updateBreaker: Opossum<[string, OrderStatus]>;

  constructor(
    private readonly deadLetterQueueService: DlqService,
    private readonly eventBus: EventBusService
  ) {
    this.updateBreaker = new Opossum(this.updateOrderStatus.bind(this), {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 10000,
    });

    this.updateBreaker.on('open', () =>
      console.warn('Circuit breaker opened: Order updates are failing')
    );
    this.updateBreaker.on('close', () =>
      console.info('Circuit breaker closed: Order updates are succeeding')
    );
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }
    if (Math.random() < 0.3) {
      throw new Error(`Random failure when updating order ${orderId}`);
    }
    order.status = status;
    console.log(`[Order] Order ${orderId} updated to ${status}.`);
  }

  async handleOrderConfirmedEvent(event: OrderConfirmedEvent): Promise<void> {
    const { orderId } = event.payload;
    try {
      await retry(async () => {
        await this.updateBreaker.fire(orderId, 'CONFIRMED');
      }, 3, 1000, 500);
    } catch (error) {
      console.error(
        `[Order] Failed to update order ${orderId} to CONFIRMED after retries: ${(error as Error)?.message ?? 'Unknown error'}`
      );
      await this.deadLetterQueueService.send(new OrderConfirmedEvent({ orderId }));
    }
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

  confirmOrder(orderId: string): void {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }
    order.status = 'CONFIRMED';
    console.log(`[OrderService] Order ${orderId} confirmed.`);
  }

  cancelOrder(orderId: string, reason?: string): void {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }
    order.status = 'CANCELLED';
    console.log(`[OrderService] Order ${orderId} cancelled. Reason: ${reason || 'Not specified'}`);
  }

  getOrderById(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }
}