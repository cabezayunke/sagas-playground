import { OrderFinishedHandler } from '../../../../src/modules/orders/application/order-finished.handler';
import { OrderConfirmedEvent, OrderCancelledEvent } from '../../../../src/core/events/events';

describe('OrderFinishedHandler', () => {
    let handler: OrderFinishedHandler;
    let slackNotificationSender: any;

    beforeEach(() => {
        slackNotificationSender = {
            sendNotification: jest.fn(),
        };
        handler = new OrderFinishedHandler(slackNotificationSender as any);
    });

    it('should handle OrderConfirmedEvent', async () => {
        const sendNotificationSpy = jest.spyOn(slackNotificationSender, 'sendNotification');
        await handler.onOrderConfirmed(new OrderConfirmedEvent({ orderId: '123' }));
        expect(sendNotificationSpy).toHaveBeenCalledWith(expect.stringContaining('Order 123 confirmed'));
    });

    it('should handle OrderCancelledEvent', async () => {
        const sendNotificationSpy = jest.spyOn(slackNotificationSender, 'sendNotification');
        await handler.onOrderCancelled(new OrderCancelledEvent({ orderId: '123', reason: 'fail' }));
        expect(sendNotificationSpy).toHaveBeenCalledWith(expect.stringContaining('Order 123 cancelled. Reason: fail'));
    });
});
