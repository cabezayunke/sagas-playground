import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from '../../../../src/modules/orders/application/order.controller';
import { OrderService } from '../../../../src/modules/orders/application/order.service';
import { DlqService } from '../../../../src/modules/dlq/domain/dlq.service';
import { Order } from '../../../../src/modules/orders/domain/order.entity';

describe('OrderController', () => {
    let controller: OrderController;
    let orderService: jest.Mocked<OrderService>;
    let dlqService: jest.Mocked<DlqService>;

    beforeEach(async () => {
        orderService = {
            createOrder: jest.fn() as jest.Mock<Order, [any]>,
            confirmOrder: jest.fn() as jest.Mock<Promise<void>, [string]>,
            cancelOrder: jest.fn() as jest.Mock<Promise<void>, [string, string?]>,
        } as unknown as jest.Mocked<OrderService>;
        dlqService = {
            send: jest.fn() as jest.Mock<Promise<void>, [any]>,
        } as unknown as jest.Mocked<DlqService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrderController],
            providers: [
                { provide: OrderService, useValue: orderService },
                { provide: DlqService, useValue: dlqService },
            ],
        }).compile();

        controller = module.get<OrderController>(OrderController);
    });

    it('should create and confirm an order (happy path)', async () => {
        const order = { id: '1', status: 'CONFIRMED' } as unknown as Order;
        orderService.createOrder.mockReturnValueOnce(order);
        const result = await controller.createOrder({ orderId: '1', items: [] });
        expect(result.status).toBe('CONFIRMED');
        expect(orderService.createOrder).toHaveBeenCalledWith('1', []);
    });

    it('should cancel order and send to DLQ if service fails (unhappy path)', async () => {
        orderService.createOrder.mockImplementationOnce(() => {
            throw new Error('test');
        });
        await expect(controller.createOrder({ orderId: '2', items: [] })).rejects.toThrow('test');
        expect(orderService.createOrder).toHaveBeenCalledWith('2', []);
    });
});
