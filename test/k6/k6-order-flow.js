import http from 'k6/http';
import { check, sleep, group } from 'k6';

export let options = {
    vus: 10, // number of virtual users
    duration: '300s', // total test duration
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4001';

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
const PRODUCTS = ['product1', 'product2', 'product3'];

export default function () {
    group('Order Saga Flow', function () {
        // 1. Create an order
        const orderId = `order-${Math.floor(Math.random() * 1000000)}`;
        // Define available products
        // Randomly choose 1-3 products for this order
        const shuffled = PRODUCTS.sort(() => 0.5 - Math.random());
        const selectedProduct = shuffled[0]
        // Create random items with random quantity (1-5)
        const items = [{
            sku: selectedProduct,
            quantity: getRandomInt(1, 5),
        }];
        const payload = JSON.stringify({
            orderId,
            items,
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
