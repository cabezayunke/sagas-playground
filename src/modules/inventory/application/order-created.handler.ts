import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InventoryService } from '../domain/inventory.service';
import { EventBusService } from '../../../core/event-bus.service';
import { OrderCreatedEvent, InventoryReservedEvent, InventoryReservationFailedEvent } from '../../../core/events/events';

@Injectable()
export class OrderCreatedHandler {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly eventBus: EventBusService,
  ) { }

  @OnEvent('OrderCreated')
  async onOrderCreated(event: OrderCreatedEvent) {
    const { orderId, items } = event.payload;
    try {
      const reserved = await this.inventoryService.reserveInventory(items);
      if (reserved) {
        this.eventBus.publish(new InventoryReservedEvent({ orderId }));
      } else {
        this.eventBus.publish(new InventoryReservationFailedEvent({ orderId, reason: 'Insufficient stock' }));
      }
    } catch (err: any) {
      this.eventBus.publish(new InventoryReservationFailedEvent({ orderId, reason: err.message }));
    }
  }
}
