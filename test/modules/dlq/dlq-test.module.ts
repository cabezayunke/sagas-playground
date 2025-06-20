import { Module } from '@nestjs/common';
import { DlqService } from '../../../src/modules/dlq/domain/dlq.service';
import { InMemoryDlqService } from '../../../src/modules/dlq/infrastructure/in-memory-dlq.service';
import { DlqProcessorService } from '../../../src/modules/dlq/infrastructure/dlq-processor.service';
import { NotificationsModule } from '../../../src/modules/notifications/notifications.module';
import { CoreModule } from '../../../src/core/core.module';

@Module({
    imports: [CoreModule, NotificationsModule],
    providers: [
        { provide: DlqService, useClass: InMemoryDlqService },
        InMemoryDlqService,
        DlqProcessorService,
    ],
    exports: [DlqService, InMemoryDlqService, DlqProcessorService],
})
export class DlqTestModule { }
