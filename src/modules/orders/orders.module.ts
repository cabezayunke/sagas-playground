import { Module } from '@nestjs/common';
import { OrderController } from './application/order.controller';
import { OrderService } from './application/order.service';
import { InventoryReserveHandler } from './application/inventory-reserve.handler';
import { DlqModule } from '../dlq/dlq.module';
import { CoreModule } from '../../core/core.module';

@Module({
    controllers: [OrderController],
    providers: [OrderService, InventoryReserveHandler],
    imports: [DlqModule, CoreModule],
    exports: [OrderService, InventoryReserveHandler],
})
export class OrdersModule { }
