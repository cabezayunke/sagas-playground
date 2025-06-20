import { InventoryReserveHandler } from '../../../../src/modules/orders/application/inventory-reserve.handler';
import { OrderService } from '../../../../src/modules/orders/application/order.service';
import { DlqService } from '../../../../src/modules/dlq/domain/dlq.service';
import { InventoryReservedEvent, InventoryReservationFailedEvent } from '../../../../src/modules/core/events/events';

describe('InventoryReserveHandler', () => {
    let handler: InventoryReserveHandler;
    let orderService: jest.Mocked<OrderService>;
    let dlqService: jest.Mocked<DlqService>;

    beforeEach(() => {
        orderService = { confirmOrder: jest.fn(), cancelOrder: jest.fn() } as any;
        dlqService = { send: jest.fn() } as any;
        handler = new InventoryReserveHandler(orderService, dlqService);
    });

    it('should confirm order on InventoryReservedEvent', async () => {
        await handler.onInventoryReserved(new InventoryReservedEvent({ orderId: '123' }));
        expect(orderService.confirmOrder).toHaveBeenCalledWith('123');
    });

    it('should cancel order on InventoryReservationFailedEvent', async () => {
        await handler.onInventoryReservationFailed(new InventoryReservationFailedEvent({ orderId: '123', reason: 'fail' }));
        expect(orderService.cancelOrder).toHaveBeenCalledWith('123', 'fail');
    });

    it('should send to DLQ on error', async () => {
        orderService.confirmOrder.mockRejectedValue(new Error('fail'));
        await handler.onInventoryReserved(new InventoryReservedEvent({ orderId: '123' }));
        expect(dlqService.send).toHaveBeenCalled();
    });
});
