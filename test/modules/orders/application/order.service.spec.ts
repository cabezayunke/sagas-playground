import { OrderService } from '../../../../src/modules/orders/application/order.service';
import { InMemoryDlqService } from '../../../../src/modules/dlq/infrastructure/in-memory-dlq.service';

describe('OrderService', () => {
  let orderService: OrderService;
  let dlqService: InMemoryDlqService;

  beforeEach(() => {
    dlqService = { add: jest.fn() } as any;
    orderService = new OrderService(dlqService, {} as any);
    // For test, add any necessary stubs/mocks
    (orderService as any).eventBus = { publish: jest.fn() };
  });

  it('should create a new order', () => {
    const order = orderService.createOrder('order-1', [{ productId: 'p1', quantity: 2 }]);
    expect(order.orderId).toBe('order-1');
    expect(order.status).toBe('PENDING');
    expect((orderService as any).orders.get('order-1')).toBe(order);
  });

  it('should confirm an order', () => {
    orderService.createOrder('order-2', []);
    orderService.confirmOrder('order-2');
    expect((orderService as any).orders.get('order-2').status).toBe('CONFIRMED');
  });

  it('should cancel an order', () => {
    orderService.createOrder('order-3', []);
    orderService.cancelOrder('order-3', 'test');
    expect((orderService as any).orders.get('order-3').status).toBe('CANCELLED');
  });

  it('should throw if order not found', () => {
    expect(() => orderService.confirmOrder('missing')).toThrow('Order missing not found.');
  });
});