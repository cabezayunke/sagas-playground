import { Injectable } from '@nestjs/common';

import { DlqService } from '../domain/dlq.service';


import { DlqEventMessageDto } from '../domain/dlq-event-message.dto';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class InMemoryDlqService implements DlqService<DlqEventMessageDto> {
  private events: DlqEventMessageDto[] = [];

  async send(message: DlqEventMessageDto): Promise<void> {
    // Validate before storing
    const dto = plainToInstance(DlqEventMessageDto, message);
    const errors = validateSync(dto);
    if (errors.length > 0) {
      console.error('[DLQ] Invalid event message (not stored):', JSON.stringify(errors));
      throw new Error('Invalid DLQ event message');
    }
    this.events.push(dto);
    console.warn('[DLQ] Event sent to DLQ:', dto.eventName, dto.payload);
  }

  async getEvents(): Promise<DlqEventMessageDto[]> {
    return this.events;
  }

  async deleteEvent(id: string): Promise<void> {
    const index = this.events.findIndex(e => e.id === id);
    if (index !== -1) {
      this.events.splice(index, 1);
    }
  }
}