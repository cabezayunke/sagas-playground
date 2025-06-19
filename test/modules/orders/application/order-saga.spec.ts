import { OrderSaga } from '../../../../src/modules/orders/application/order-saga';
import { EventBusService } from '../../../../src/common/event-bus.service';
import { InventoryReservedEvent, InventoryReservationFailedEvent } from '../../../../src/core/events/events';

describe('OrderSaga', () => {
  let saga: OrderSaga;
  let eventBus: EventBusService;

  beforeEach(() => {
    eventBus = { publish: jest.fn() } as any;
    saga = new OrderSaga(eventBus);
  });

  it('canHandle InventoryReserved/InventoryReservationFailed', () => {
    expect(saga.canHandle(new InventoryReservedEvent({ orderId: '1' }))).toBe(true);
    expect(saga.canHandle(new InventoryReservationFailedEvent({ orderId: '1', reason: 'fail' }))).toBe(true);
    expect(saga.canHandle({ eventName: 'OtherEvent', payload: {} })).toBe(false);
  });

  it('handle InventoryReservedEvent should publish OrderConfirmedEvent', async () => {
    await saga.handle(new InventoryReservedEvent({ orderId: '1' }));
    expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'OrderConfirmed' }));
  });

  it('handle InventoryReservationFailedEvent should publish OrderCancelledEvent', async () => {
    await saga.handle(new InventoryReservationFailedEvent({ orderId: '1', reason: 'fail' }));
    expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'OrderCancelled' }));
  });
});