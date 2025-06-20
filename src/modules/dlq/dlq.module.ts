import { Module } from '@nestjs/common';
import { DlqService } from './domain/dlq.service';
import { InMemoryDlqService } from './infrastructure/in-memory-dlq.service';
import { RabbitMqDlqService } from './infrastructure/rabbitmq-dlq.service';
import { MongoDlqService } from './infrastructure/mongo-dlq.service';
import { DlqProcessorService } from './infrastructure/dlq-processor.service';
import { DlqEventSchema } from './infrastructure/dlq-event.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [MongooseModule.forFeature([{ name: 'DlqEvent', schema: DlqEventSchema }]), NotificationsModule],
    providers: [
        { provide: DlqService, useClass: InMemoryDlqService },
        InMemoryDlqService,
        RabbitMqDlqService,
        MongoDlqService,
        DlqProcessorService,
    ],
    exports: [DlqService, InMemoryDlqService, RabbitMqDlqService, MongoDlqService, DlqProcessorService],
})
export class DlqModule { }
