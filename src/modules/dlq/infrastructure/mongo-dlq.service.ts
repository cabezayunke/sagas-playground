import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DlqService } from '../domain/dlq.service';
import { DlqEventMessageDto } from '../domain/dlq-event-message.dto';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DlqEvent } from '../infrastructure/dlq-event.schema';

@Injectable()
export class MongoDlqService implements DlqService<DlqEventMessageDto> {
  private readonly logger = new Logger(MongoDlqService.name);

  constructor(
    @InjectModel(DlqEvent.name) private dlqModel: Model<DlqEvent>
  ) { }


  async send(message: DlqEventMessageDto): Promise<void> {
    const dto = plainToInstance(DlqEventMessageDto, message);
    const errors = validateSync(dto);
    if (errors.length > 0) {
      this.logger.error('[DLQ] Invalid event message (not stored):', JSON.stringify(errors));
      throw new Error('Invalid DLQ event message');
    }
    try {
      await this.dlqModel?.create(dto);
      this.logger.log(`[DLQ] Event stored in MongoDB: ${dto.eventName}`);
    } catch (err) {
      this.logger.error('[DLQ] Failed to store event in MongoDB:', err);
      throw err;
    }
  }

  async getEvents(): Promise<DlqEventMessageDto[]> {
    const docs = await this.dlqModel?.find().lean();
    return docs as DlqEventMessageDto[];
  }

  async deleteEvent(id: string): Promise<void> {
    await this.dlqModel?.deleteOne({ id });
    this.logger.log(`[DLQ] Event with id ${id} deleted from MongoDB.`);
  }
}
