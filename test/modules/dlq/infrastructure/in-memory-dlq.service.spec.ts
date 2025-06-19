import { InMemoryDlqService } from '../../../../src/modules/dlq/infrastructure/in-memory-dlq.service';

describe('InMemoryDlqService', () => {
  let service: InMemoryDlqService;

  beforeEach(() => {
    service = new InMemoryDlqService();
  });

  it('should store events with send', async () => {
    const message = { id: '1', eventName: 'TestEvent', payload: { foo: 'bar' } };
    await service.send(message);
    const events = await service.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(message);
  });

  it('should return all stored events', async () => {
    const msg1 = { id: '1', eventName: 'A', payload: {} };
    const msg2 = { id: '2', eventName: 'B', payload: {} };
    await service.send(msg1);
    await service.send(msg2);
    const events = await service.getEvents();
    expect(events).toHaveLength(2);
    expect(events).toEqual([msg1, msg2]);
  });

  it('should delete an event by id', async () => {
    const msg1 = { id: '1', eventName: 'A', payload: {} };
    const msg2 = { id: '2', eventName: 'B', payload: {} };
    await service.send(msg1);
    await service.send(msg2);
    await service.deleteEvent('1');
    const events = await service.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(msg2);
  });

  it('should do nothing if deleting a non-existent id', async () => {
    const msg = { id: '1', eventName: 'A', payload: {} };
    await service.send(msg);
    await service.deleteEvent('non-existent');
    const events = await service.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(msg);
  });
});
