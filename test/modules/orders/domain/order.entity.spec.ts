import { Order, OrderStatus } from '../../../../src/modules/orders/domain/order.entity';

describe('Order interface and OrderStatus type', () => {
    it('should allow creation of a valid Order object', () => {
        const order: Order = {
            orderId: 'order-1',
            items: [{ productId: 'p1', quantity: 2 }],
            status: 'PENDING',
        };
        expect(order.orderId).toBe('order-1');
        expect(order.items.length).toBe(1);
        expect(order.status).toBe('PENDING');
    });

});
