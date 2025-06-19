import { Injectable } from '@nestjs/common';
import { Saga } from '../../../core/saga.interface';
import {
  DomainEvent,
  InventoryReservedEvent,
  InventoryReservationFailedEvent,
  OrderConfirmedEvent,
  OrderCancelledEvent,
} from '../../../core/events/events';
import { EventBusService } from '../../../common/event-bus.service';

@Injectable()
export class OrderSaga implements Saga {
  constructor(private readonly eventBus: EventBusService) { }

  canHandle(event: DomainEvent): boolean {
    return event.eventName === 'InventoryReserved' || event.eventName === 'InventoryReservationFailed';
  }

  async handle(event: DomainEvent): Promise<void> {
    if (event.eventName === 'InventoryReserved') {
      const { orderId } = event.payload;
      console.log(`[OrderSaga] Inventory reserved for order ${orderId}. Publishing OrderConfirmedEvent.`);
      this.eventBus.publish(new OrderConfirmedEvent({ orderId }));
    } else if (event.eventName === 'InventoryReservationFailed') {
      const { orderId, reason } = event.payload;
      console.log(`[OrderSaga] Inventory reservation failed for order ${orderId}: ${reason}. Publishing OrderCancelledEvent.`);
      this.eventBus.publish(new OrderCancelledEvent({ orderId, reason }));
    }
  }
}