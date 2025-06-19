import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderService } from '../../orders/application/order.service';
import { DomainEvent, InventoryReservationFailedEvent, InventoryReservedEvent, OrderCancelledEvent, OrderConfirmedEvent, OrderCreatedEvent } from '../../../core/events/events';
import { SlackNotificationService } from '../../notifications/infrastructure/slack-notification.service';
import { DlqService } from '../../dlq/domain/dlq.service';
import { DlqEventMessageDto } from '../domain/dlq-event-message.dto';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { EventBusService } from '../../../core/event-bus.service';

@Injectable()
export class DlqProcessorService {
  private readonly logger = new Logger(DlqProcessorService.name);

  constructor(
    private readonly slackService: SlackNotificationService,
    private readonly dlqService: DlqService,
    private readonly eventBus: EventBusService,
  ) { }



  @Cron(CronExpression.EVERY_MINUTE)
  async processDlq(): Promise<void> {
    this.logger.log('Starting DLQ processing...');
    const failedEvents: DlqEventMessageDto[] = await this.dlqService.getEvents();

    if (!failedEvents || failedEvents.length === 0) {
      this.logger.log('No events in DLQ.');
      return;
    }

    for (const event of failedEvents) {
      // Validate the event message
      const dto = plainToInstance(DlqEventMessageDto, event);
      const errors = validateSync(dto);
      if (errors.length > 0) {
        this.logger.error('Invalid DLQ event message (skipped)', JSON.stringify(errors));
        continue;
      }
      this.logger.log(`Reprocessing event ${event.eventName} for Order ID ${event.payload.orderId}`);
      try {
        switch (event.eventName) {
          case 'OrderConfirmed':
            this.eventBus.publish(new OrderConfirmedEvent({ orderId: event.payload.orderId }));
            break;
          case 'OrderCancelled':
            this.eventBus.publish(new OrderCancelledEvent({ orderId: event.payload.orderId }));
            break;
          case 'OrderCreated':
            this.eventBus.publish(new OrderCreatedEvent({ orderId: event.payload.orderId, items: event.payload.items }));
            break;
          case 'InventoryReserved':
            this.eventBus.publish(new InventoryReservedEvent({ orderId: event.payload.orderId }));
            break;
          case 'InventoryReservationFailed':
            this.eventBus.publish(new InventoryReservationFailedEvent({ orderId: event.payload.orderId, reason: event.payload.reason }));
            break;
          default:
            this.logger.error(`Unknown event name: ${event.eventName}`);
            break;
        }
        this.logger.log(`Processed event for Order ${event.payload.orderId} successfully.`);
        await this.dlqService.deleteEvent(event.id);
      } catch (error) {
        this.logger.error(`Reprocessing failed for event ${event.eventName}: ${(error as Error)?.message ?? 'Unknown error'}`);
        await this.slackService.sendNotification(
          `DLQ reprocess failure: ${event.eventName} for Order ${event.payload.orderId} still failing.`
        );
      }
    }
  }
}