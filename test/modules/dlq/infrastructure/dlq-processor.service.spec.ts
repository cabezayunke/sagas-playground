import { DlqProcessorService } from '../../../../src/modules/dlq/infrastructure/dlq-processor.service';
import { InMemoryDlqService } from '../../../../src/modules/dlq/infrastructure/in-memory-dlq.service';

// Mocks
const mockOrderService = {
    handleOrderConfirmedEvent: jest.fn()
};
const mockSlackService = {
    sendNotification: jest.fn()
};

describe('DlqProcessorService', () => {
    let dlq: InMemoryDlqService;
    let service: DlqProcessorService;

    beforeEach(() => {
        dlq = new InMemoryDlqService();
        jest.clearAllMocks();
        service = new DlqProcessorService(
            mockOrderService as any,
            mockSlackService as any,
            dlq as any
        );
    });

    it('should log and do nothing if DLQ is empty', async () => {
        const logSpy = jest.spyOn((service as any).logger, 'log');
        await service.processDlq();
        expect(logSpy).toHaveBeenCalledWith('No events in DLQ.');
        expect(mockOrderService.handleOrderConfirmedEvent).not.toHaveBeenCalled();
        expect(mockSlackService.sendNotification).not.toHaveBeenCalled();
    });

    it('should process OrderConfirmed event and call orderService', async () => {
        const event = {
            id: '1',
            eventName: 'OrderConfirmed',
            payload: { orderId: 'order-123' }
        };
        await dlq.send(event);
        await service.processDlq();
        expect(mockOrderService.handleOrderConfirmedEvent).toHaveBeenCalled();
        console.log(mockOrderService.handleOrderConfirmedEvent.mock.calls[0][0])
        expect(mockOrderService.handleOrderConfirmedEvent.mock.calls[0][0].payload.orderId).toBe('order-123');
    });

    it('should notify Slack and log error if reprocessing fails', async () => {
        mockOrderService.handleOrderConfirmedEvent.mockImplementation(() => { throw new Error('fail'); });
        const event = {
            id: '1',
            eventName: 'OrderConfirmed',
            payload: { orderId: 'order-err' }
        };
        await dlq.send(event);
        const logSpy = jest.spyOn((service as any).logger, 'error');
        await service.processDlq();
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Reprocessing failed for event'));
        expect(mockSlackService.sendNotification).toHaveBeenCalledWith(
            expect.stringContaining('DLQ reprocess failure: OrderConfirmed for Order order-err still failing.')
        );
    });
});
