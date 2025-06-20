import { Module } from '@nestjs/common';
import { InventoryService } from './domain/inventory.service';
import { OrderCreatedHandler } from './application/order-created.handler';
import { EventBusService } from '../core/event-bus.service';
import { DlqModule } from '../dlq/dlq.module';
import { CoreModule } from '../core/core.module';

@Module({
  providers: [InventoryService, OrderCreatedHandler, EventBusService],
  imports: [DlqModule, CoreModule],
  exports: [InventoryService, OrderCreatedHandler],
})
export class InventoryModule { }
