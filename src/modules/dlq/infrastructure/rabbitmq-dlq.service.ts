import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { rabbitMQOptions } from '../../../rabbitmq.options';
import { DlqService } from '../domain/dlq.service';
import { DlqEventMessageDto } from '../domain/dlq-event-message.dto';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RabbitMqDlqService implements DlqService<DlqEventMessageDto> {
  private client: ClientProxy;
  private readonly logger = new Logger(RabbitMqDlqService.name);

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: rabbitMQOptions.transport,
      options: {
        urls: rabbitMQOptions.options?.urls,
        queue: 'dead_letter_queue',
      },
    });
  }

  async send(message: DlqEventMessageDto): Promise<void> {
    // Optionally validate before sending
    const dto = plainToInstance(DlqEventMessageDto, message);
    const errors = validateSync(dto);
    if (errors.length > 0) {
      this.logger.error('Invalid DLQ event message (not sent)', JSON.stringify(errors));
      throw new Error('Invalid DLQ event message');
    }
    try {
      await this.client.emit<any>('dlq_event', message).toPromise();
      this.logger.log(`Published event to DLQ: ${JSON.stringify(message)}`);
    } catch (error) {
      this.logger.error('Failed to publish event to DLQ', error);
    }
  }

  async getEvents(): Promise<any[]> {
    // Not implemented: RabbitMQ DLQ reading would require queue inspection
    this.logger.warn('getEvents is not implemented for RabbitMqDlqService');
    return [];
  }

  async deleteEvent(id: string): Promise<void> {
    // Not implemented: Deleting a specific message from RabbitMQ DLQ is non-trivial
    this.logger.warn('deleteEvent is not implemented for RabbitMqDlqService');
  }
}