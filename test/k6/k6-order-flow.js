import http from 'k6/http';
import { check, sleep, group } from 'k6';

export let options = {
    vus: 10, // number of virtual users
    duration: '30s', // total test duration
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4001';

export default function () {
    group('Order Saga Flow', function () {
        // 1. Create an order
        const orderId = `order-${Math.floor(Math.random() * 1000000)}`;
        const payload = JSON.stringify({
            orderId,
            items: [
                { sku: 'item1', quantity: 2 },
                { sku: 'item2', quantity: 1 },
            ],
        });
        const params = { headers: { 'Content-Type': 'application/json' } };
        const res = http.post(`${BASE_URL}/orders`, payload, params);
        check(res, {
            'Order created (201)': (r) => r.status === 201,
            'OrderId returned': (r) => r.json('orderId') === orderId,
            'Status is PENDING': (r) => r.json('status') === 'PENDING',
        });

        // 2. (Optional) Simulate other actions, e.g., confirm/cancel order, inventory reserve, etc.
        // You can add more requests here as your saga flow grows.

        sleep(1); // Simulate user think time
    });
}
