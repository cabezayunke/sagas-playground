import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderController } from './modules/orders/application/order.controller';
import { OrderService } from './modules/orders/application/order.service';
import { InventoryService } from './modules/inventory/application/inventory.service';
import { EventBusService } from './common/event-bus.service';
import { SagaOrchestrator } from './core/saga-orchestrator.service';
import { OrderSaga } from './modules/orders/application/order-saga';
import { InMemoryDlqService } from './modules/dlq/infrastructure/in-memory-dlq.service';
import { RabbitMqDlqService } from './modules/dlq/infrastructure/rabbitmq-dlq.service';
import { MongoDlqService } from './modules/dlq/infrastructure/mongo-dlq.service';
import { SlackNotificationService } from './modules/notifications/infrastructure/slack-notification.service';
import { DlqProcessorService } from './modules/dlq/infrastructure/dlq-processor.service';
import { DlqService } from './modules/dlq/domain/dlq.service';
import { DlqEventSchema } from './modules/dlq/infrastructure/dlq-event.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
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
    MongoDlqService,
    SlackNotificationService,
    DlqProcessorService,
    // Dynamic DLQ provider
    {
      provide: DlqService,
      inject: [ConfigService, getModelToken('DlqEvent')],
      useFactory: (configService: ConfigService, dlqModel: Model<any>) => {
        const backend = configService.get<string>('DLQ_BACKEND');
        if (backend === 'rabbitmq') return new RabbitMqDlqService();
        if (backend === 'mongo') return new MongoDlqService(dlqModel);
        return new InMemoryDlqService();
      },
    },
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