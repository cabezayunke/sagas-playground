import { Module, OnModuleInit } from '@nestjs/common';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrdersModule } from './modules/orders/orders.module';

import { InventoryModule } from './modules/inventory/inventory.module';
import { DlqModule } from './modules/dlq/dlq.module';
import { DlqService } from './modules/dlq/domain/dlq.service';
import { DlqEventSchema } from './modules/dlq/infrastructure/dlq-event.schema';
import { OrderController } from './modules/orders/application/order.controller';

import { InMemoryDlqService } from './modules/dlq/infrastructure/in-memory-dlq.service';
import { MongoDlqService } from './modules/dlq/infrastructure/mongo-dlq.service';
import { RabbitMqDlqService } from './modules/dlq/infrastructure/rabbitmq-dlq.service';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    ScheduleModule.forRoot(),
    NotificationsModule,
    DlqModule,
    InventoryModule,
    OrdersModule,
  ],
  controllers: [OrderController],
  providers: [
    // Dynamic DLQ provider
    {
      provide: DlqService,
      inject: [ConfigService, InMemoryDlqService, MongoDlqService, RabbitMqDlqService],
      useFactory: (
        configService: ConfigService,
        inMemoryDlq: InMemoryDlqService,
        mongoDlq: MongoDlqService,
        rabbitMqDlq: RabbitMqDlqService,
      ) => {
        const backend = configService.get<string>('DLQ_BACKEND');
        if (backend === 'mongo') {
          return mongoDlq;
        }
        if (backend === 'rabbitmq') return rabbitMqDlq;
        return inMemoryDlq;
      }
    },
  ],
})
export class AppModule { }