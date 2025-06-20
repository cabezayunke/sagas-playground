import { Module } from '@nestjs/common';
import { OrderController } from '../../src/modules/orders/application/order.controller';
import { OrderService } from '../../src/modules/orders/application/order.service';
import { DlqTestModule } from '../modules/dlq/dlq-test.module';
import { CoreModule } from '../../src/modules/core/core.module';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { EventEmitterModule } from '@nestjs/event-emitter';


@Module({
    imports: [EventEmitterModule.forRoot(), CoreModule, DlqTestModule, NotificationsModule],
    controllers: [OrderController],
    providers: [
        OrderService,
    ],
})
export class OrderE2ETestModule { }
