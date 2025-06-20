import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InventoryService } from '../domain/inventory.service';
import { EventBusService } from '../../core/event-bus.service';
import { OrderCreatedEvent, InventoryReservedEvent, InventoryReservationFailedEvent } from '../../core/events/events';

@Injectable()
export class OrderCreatedHandler {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly eventBus: EventBusService,
  ) { }

  @OnEvent(OrderCreatedEvent.name)
  async onOrderCreated(event: OrderCreatedEvent) {
    const { orderId, items } = event.payload;
    console.log(`[Inventory:OrderCreatedHandler] Handling OrderCreated event for order ${orderId}`);

    try {
      const reserved = await this.inventoryService.reserveInventory(items);
      if (reserved) {
        console.log(`[Inventory:OrderCreatedHandler] Inventory reserved for order ${orderId}`);
        this.eventBus.publish(new InventoryReservedEvent({ orderId }));
      } else {
        console.log(`[Inventory:OrderCreatedHandler] Inventory reservation failed for order ${orderId}`);
        this.eventBus.publish(new InventoryReservationFailedEvent({ orderId, reason: 'Insufficient stock' }));
      }
    } catch (err: any) {
      console.log(`[Inventory:OrderCreatedHandler] Inventory reservation failed for order ${orderId}`);
      this.eventBus.publish(new InventoryReservationFailedEvent({ orderId, reason: err.message }));
    }
  }
}
