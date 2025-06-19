import { RabbitMqDlqService } from '../../../../src/modules/dlq/infrastructure/rabbitmq-dlq.service';

describe('RabbitMqDlqService', () => {
  let service: RabbitMqDlqService;

  beforeEach(() => {
    service = new RabbitMqDlqService();
    // You may want to mock internal RabbitMQ connection/logic here
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more detailed tests if you expose connection/mocking
  // For now, just check that methods exist
  it('should have send, getEvents, and deleteEvent methods', () => {
    expect(typeof service.send).toBe('function');
    expect(typeof service.getEvents).toBe('function');
    expect(typeof service.deleteEvent).toBe('function');
  });
});
