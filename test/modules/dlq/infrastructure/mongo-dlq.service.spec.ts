import { MongoDlqService } from '../../../../src/modules/dlq/infrastructure/mongo-dlq.service';
import { DlqEventMessageDto } from '../../../../src/modules/dlq/domain/dlq-event-message.dto';
import { Model } from 'mongoose';

describe('MongoDlqService', () => {
  let service: MongoDlqService;
  let model: jest.Mocked<Model<any>>;

  beforeEach(() => {
    model = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]), lean: jest.fn().mockResolvedValue([]) }),
      deleteOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) }),
    } as any;
    service = new MongoDlqService(model);
  });

  it('should send a message', async () => {
    const dto: DlqEventMessageDto = { id: '1', eventName: 'test', payload: {}, timestamp: Date.now() };
    await service.send(dto);
    expect(model.create).toHaveBeenCalledWith(dto);
  });

  it('should get events', async () => {
    await service.getEvents();
    expect(model.find).toHaveBeenCalled();
  });

  it('should delete an event', async () => {
    await service.deleteEvent('1');
    expect(model.deleteOne).toHaveBeenCalledWith({ id: '1' });
  });
});
