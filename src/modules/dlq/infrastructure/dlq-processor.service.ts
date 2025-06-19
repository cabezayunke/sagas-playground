import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderService } from '../../orders/application/order.service';
import { DomainEvent, OrderConfirmedEvent } from '../../../core/events/events';
import { SlackNotificationService } from '../../notifications/infrastructure/slack-notification.service';
import { DlqService } from '../../dlq/domain/dlq.service';

@Injectable()
export class DlqProcessorService {
  private readonly logger = new Logger(DlqProcessorService.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly slackService: SlackNotificationService,
    private readonly dlqService: DlqService,
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async processDlq(): Promise<void> {
    this.logger.log('Starting DLQ processing...');
    const failedEvents: DomainEvent[] = await this.dlqService.getEvents();

    if (!failedEvents || failedEvents.length === 0) {
      this.logger.log('No events in DLQ.');
      return;
    }

    for (const event of failedEvents) {
      this.logger.log(`Reprocessing event ${event.eventName} for Order ID ${event.payload.orderId}`);
      try {
        if (event.eventName === 'OrderConfirmed') {
          await this.orderService.handleOrderConfirmedEvent(
            new OrderConfirmedEvent({ orderId: event.payload.orderId })
          );
        }
        this.logger.log(`Processed event for Order ${event.payload.orderId} successfully.`);
      } catch (error) {
        this.logger.error(`Reprocessing failed for event ${event.eventName}: ${(error as Error)?.message ?? 'Unknown error'}`);
        await this.slackService.sendNotification(
          `DLQ reprocess failure: ${event.eventName} for Order ${event.payload.orderId} still failing.`
        );
      }
    }
  }
}