import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderController } from './modules/orders/application/order.controller';
import { OrderService } from './modules/orders/application/order.service';
import { InventoryService } from './modules/inventory/application/inventory.service';
import { EventBusService } from './common/event-bus.service';
import { SagaOrchestrator } from './core/saga-orchestrator.service';
import { OrderSaga } from './modules/orders/application/order-saga';
import { InMemoryDlqService } from './modules/dlq/infrastructure/in-memory-dlq.service';
import { SlackNotificationService } from './modules/notifications/infrastructure/slack-notification.service';
import { DlqProcessorService } from './modules/dlq/infrastructure/dlq-processor.service';
import { RabbitMqDlqService } from './modules/dlq/infrastructure/rabbitmq-dlq.service';
import { DlqEventSchema } from './modules/dlq/infrastructure/dlq-event.schema';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/your-db-name'),
    MongooseModule.forFeature([{ name: 'DlqEvent', schema: DlqEventSchema }]),
    ScheduleModule.forRoot(),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    InventoryService,
    EventBusService,
    SagaOrchestrator,
    OrderSaga,
    InMemoryDlqService,
    RabbitMqDlqService,
    SlackNotificationService,
    DlqProcessorService,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly sagaOrchestrator: SagaOrchestrator,
    private readonly orderSaga: OrderSaga,
  ) { }

  onModuleInit() {
    this.sagaOrchestrator.registerSaga(this.orderSaga);
  }
}