import { EventBusService } from "../../src/modules/core/event-bus.service";

import { EventEmitter2 } from '@nestjs/event-emitter';

const mockEventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
const eventBus = new EventBusService(mockEventEmitter);

describe('EventBusService', () => {
  it('should publish and subscribe events', () => {
    const handler = jest.fn();
    eventBus.subscribe('TestEvent', handler);

    const event = { eventName: 'TestEvent', payload: { foo: 'bar' } };
    eventBus.publish(event as any);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('should call global subscribers for any event', () => {
    const handler = jest.fn();
    eventBus.subscribeAll(handler);

    const event = { eventName: 'SomeEvent', payload: {} };
    eventBus.publish(event as any);

    expect(handler).toHaveBeenCalledWith(event);
  });
});