import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderConfirmedEvent, OrderCancelledEvent } from '../../../core/events/events';
import { SlackNotificationService } from '../../notifications/infrastructure/slack-notification.service';

@Injectable()
export class OrderFinishedHandler {
    constructor(
        private readonly slackService: SlackNotificationService,
    ) { }

    @OnEvent('OrderConfirmedEvent')
    async onOrderConfirmed(event: OrderConfirmedEvent) {
        const { orderId } = event.payload;
        // Add post-confirmation logic here (e.g., send notifications, update analytics, etc.)
        await this.slackService.sendNotification(
            `[OrderFinishedHandler] Order ${orderId} confirmed`
        );
    }

    @OnEvent('OrderCancelledEvent')
    async onOrderCancelled(event: OrderCancelledEvent) {
        const { orderId, reason } = event.payload;
        // Add post-cancellation logic here (e.g., send notifications, trigger compensations, etc.)
        await this.slackService.sendNotification(
            `[OrderFinishedHandler] Order ${orderId} cancelled. Reason: ${reason ?? 'Not specified'}`
        );
    }
}
