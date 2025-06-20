import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryReservationFailedEvent, InventoryReservedEvent, OrderCancelledEvent, OrderConfirmedEvent, OrderCreatedEvent } from '../../core/events/events';
import { SlackNotificationService } from '../../notifications/infrastructure/slack-notification.service';
import { DlqService } from '../../dlq/domain/dlq.service';
import { DlqEventMessageDto } from '../domain/dlq-event-message.dto';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { EventBusService } from '../../core/event-bus.service';

@Injectable()
export class DlqProcessorService {

  constructor(
    private readonly slackService: SlackNotificationService,
    private readonly dlqService: DlqService,
    private readonly eventBus: EventBusService,
  ) { }



  @Cron(CronExpression.EVERY_MINUTE)
  async processDlq(): Promise<void> {
    console.log('[DlqProcessorService] Starting DLQ processing...');
    const failedEvents: DlqEventMessageDto[] = await this.dlqService.getEvents();

    if (!failedEvents || failedEvents.length === 0) {
      console.log('[DlqProcessorService] No events in DLQ.');
      return;
    }

    for (const event of failedEvents) {
      // Validate the event message
      const dto = plainToInstance(DlqEventMessageDto, event);
      const errors = validateSync(dto);
      if (errors.length > 0) {
        console.error('[DlqProcessorService] Invalid DLQ event message (skipped)', JSON.stringify(errors));
        continue;
      }
      try {
        const retries = event.retries ? event.retries + 1 : 1;
        console.log(`
          [DlqProcessorService] Reprocessing event ${event.eventName} for Order ID ${event.payload.orderId}
          Retries: ${retries}
          `);

        switch (event.eventName) {
          case OrderConfirmedEvent.name:
            this.eventBus.publish(new OrderConfirmedEvent({ orderId: event.payload.orderId }, retries));
            break;
          case OrderCancelledEvent.name:
            this.eventBus.publish(new OrderCancelledEvent({ orderId: event.payload.orderId, reason: event.payload.reason }, retries));
            break;
          case OrderCreatedEvent.name:
            this.eventBus.publish(new OrderCreatedEvent({ orderId: event.payload.orderId, items: event.payload.items }, retries));
            break;
          case InventoryReservedEvent.name:
            this.eventBus.publish(new InventoryReservedEvent({ orderId: event.payload.orderId }, retries));
            break;
          case InventoryReservationFailedEvent.name:
            this.eventBus.publish(new InventoryReservationFailedEvent({ orderId: event.payload.orderId, reason: event.payload.reason }));
            break;
          default:
            console.error(`[DlqProcessorService] Unknown event name: ${event.eventName}`);
            break;
        }
        console.log(`
          [DlqProcessorService] Processed event for Order ${event.payload.orderId} successfully.
          Retries: ${retries}
          `);
        await this.dlqService.deleteEvent(event.id);
      } catch (error) {
        console.error(`
          [DlqProcessorService] Reprocessing failed for event ${event.eventName}: ${(error as Error)?.message ?? 'Unknown error'}
          `);
        await this.slackService.sendNotification(
          `DLQ reprocess failure: ${event.eventName} for Order ${event.payload.orderId} still failing.`
        );
      }
    }
  }
}