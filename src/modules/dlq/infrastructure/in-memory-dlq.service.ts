import { Injectable } from '@nestjs/common';

import { DlqService } from '../domain/dlq.service';

@Injectable()
export class InMemoryDlqService implements DlqService<any> {
  private events: any[] = [];

  async send(message: any): Promise<void> {
    this.events.push(message);
    console.warn('[DLQ] Event sent to DLQ:', message.eventName, message.payload);
  }

  async getEvents(): Promise<any[]> {
    return this.events;
  }

  async deleteEvent(id: string): Promise<void> {
    const index = this.events.findIndex(e => e.id === id);
    if (index !== -1) {
      this.events.splice(index, 1);
    }
  }
}