import { DlqProcessorService } from '../../../../src/modules/dlq/infrastructure/dlq-processor.service';
import { DlqEventMessageDto } from '../../../../src/modules/dlq/domain/dlq-event-message.dto';
import { OrderConfirmedEvent, OrderCancelledEvent, OrderCreatedEvent, InventoryReservedEvent, InventoryReservationFailedEvent } from '../../../../src/core/events/events';

const mockSlackService = { sendNotification: jest.fn() };
const mockDlqService = {
    getEvents: jest.fn(),
    deleteEvent: jest.fn()
};
const mockEventBus = { publish: jest.fn() };

let service: DlqProcessorService;

describe('DlqProcessorService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        service = new DlqProcessorService(
            mockSlackService as any,
            mockDlqService as any,
            mockEventBus as any
        );
    });

    it('should log and do nothing if DLQ is empty', async () => {
        mockDlqService.getEvents.mockResolvedValue([]);
        const logSpy = jest.spyOn((service as any).logger, 'log');
        await service.processDlq();
        expect(logSpy).toHaveBeenCalledWith('No events in DLQ.');
        expect(mockSlackService.sendNotification).not.toHaveBeenCalled();
        expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should process OrderConfirmed event and call eventBus.publish and deleteEvent', async () => {
        const event = { id: '1', eventName: 'OrderConfirmed', payload: { orderId: 'abc' } };
        mockDlqService.getEvents.mockResolvedValue([event]);
        mockDlqService.deleteEvent.mockResolvedValue(undefined);
        await service.processDlq();
        expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(OrderConfirmedEvent));
        expect(mockDlqService.deleteEvent).toHaveBeenCalledWith('1');
    });

    it('should process OrderCancelled event and call eventBus.publish and deleteEvent', async () => {
        const event = { id: '2', eventName: 'OrderCancelled', payload: { orderId: 'def' } };
        mockDlqService.getEvents.mockResolvedValue([event]);
        mockDlqService.deleteEvent.mockResolvedValue(undefined);
        await service.processDlq();
        expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(OrderCancelledEvent));
        expect(mockDlqService.deleteEvent).toHaveBeenCalledWith('2');
    });

    it('should process OrderCreated event and call eventBus.publish and deleteEvent', async () => {
        const event = { id: '3', eventName: 'OrderCreated', payload: { orderId: 'ghi', items: [1, 2, 3] } };
        mockDlqService.getEvents.mockResolvedValue([event]);
        mockDlqService.deleteEvent.mockResolvedValue(undefined);
        await service.processDlq();
        expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(OrderCreatedEvent));
        expect(mockDlqService.deleteEvent).toHaveBeenCalledWith('3');
    });

    it('should process InventoryReserved event and call eventBus.publish and deleteEvent', async () => {
        const event = { id: '4', eventName: 'InventoryReserved', payload: { orderId: 'xyz' } };
        mockDlqService.getEvents.mockResolvedValue([event]);
        mockDlqService.deleteEvent.mockResolvedValue(undefined);
        await service.processDlq();
        expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(InventoryReservedEvent));
        expect(mockDlqService.deleteEvent).toHaveBeenCalledWith('4');
    });

    it('should process InventoryReservationFailed event and call eventBus.publish and deleteEvent', async () => {
        const event = { id: '5', eventName: 'InventoryReservationFailed', payload: { orderId: 'fail', reason: 'no stock' } };
        mockDlqService.getEvents.mockResolvedValue([event]);
        mockDlqService.deleteEvent.mockResolvedValue(undefined);
        await service.processDlq();
        expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(InventoryReservationFailedEvent));
        expect(mockDlqService.deleteEvent).toHaveBeenCalledWith('5');
    });


    it('should log error on unknown event name', async () => {
        const event = { id: '7', eventName: 'UnknownEvent', payload: { orderId: 'unk' } };
        mockDlqService.getEvents.mockResolvedValue([event]);
        const errorSpy = jest.spyOn((service as any).logger, 'error');
        await service.processDlq();
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown event name: UnknownEvent'));
        expect(mockEventBus.publish).not.toHaveBeenCalled();
        expect(mockDlqService.deleteEvent).toHaveBeenCalledWith('7');
    });

    it('should notify Slack and log error if reprocessing fails', async () => {
        const event = { id: '8', eventName: 'OrderConfirmed', payload: { orderId: 'err' } };
        mockDlqService.getEvents.mockResolvedValue([event]);
        mockDlqService.deleteEvent.mockResolvedValue(undefined);
        mockEventBus.publish.mockImplementation(() => { throw new Error('publish fail'); });
        const errorSpy = jest.spyOn((service as any).logger, 'error');
        await service.processDlq();
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Reprocessing failed for event OrderConfirmed: publish fail'));
        expect(mockSlackService.sendNotification).toHaveBeenCalledWith(expect.stringContaining('DLQ reprocess failure: OrderConfirmed for Order err still failing.'));
        // Should not delete event on failure
        expect(mockDlqService.deleteEvent).not.toHaveBeenCalledWith('8');
    });
});

