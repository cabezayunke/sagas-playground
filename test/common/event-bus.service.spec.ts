import { EventBusService } from '../../src/common/event-bus.service';

describe('EventBusService', () => {
  it('should publish and subscribe events', () => {
    const eventBus = new EventBusService();
    const handler = jest.fn();
    eventBus.subscribe('TestEvent', handler);

    const event = { eventName: 'TestEvent', payload: { foo: 'bar' } };
    eventBus.publish(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('should call global subscribers for any event', () => {
    const eventBus = new EventBusService();
    const handler = jest.fn();
    eventBus.subscribeAll(handler);

    const event = { eventName: 'SomeEvent', payload: {} };
    eventBus.publish(event);

    expect(handler).toHaveBeenCalledWith(event);
  });
});