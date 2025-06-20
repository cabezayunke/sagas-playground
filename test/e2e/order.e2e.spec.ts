import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { OrderE2ETestModule } from './order.e2e-test.module';

describe('OrderController (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [OrderE2ETestModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should create an order (happy path)', async () => {
        const payload = {
            orderId: 'order123',
            items: [{ sku: 'item1', quantity: 2 }, { sku: 'item2', quantity: 1 }],
        };
        const response = await request(app.getHttpServer())
            .post('/orders')
            .send(payload)
            .expect(201);
        expect(response.body).toMatchObject({
            orderId: 'order123',
            items: payload.items,
            status: 'PENDING', // The service returns PENDING immediately, then updates later
        });
    });

    it('should fail with 400 if orderId is missing', async () => {
        const payload = {
            items: [{ sku: 'item1', quantity: 2 }],
        };
        const response = await request(app.getHttpServer())
            .post('/orders')
            .send(payload)
            .expect(400);
        expect(response.body.message[0]).toContain('orderId');
    });

    it('should fail with 400 if items array is empty', async () => {
        const payload = {
            orderId: 'order456',
            items: [],
        };
        const response = await request(app.getHttpServer())
            .post('/orders')
            .send(payload)
            .expect(400);
        expect(response.body.message[0]).toContain('items');
    });

    it('should fail with 400 if items is not an array', async () => {
        const payload = {
            orderId: 'order789',
            items: 'not-an-array',
        };
        const response = await request(app.getHttpServer())
            .post('/orders')
            .send(payload)
            .expect(400);
        expect(response.body.message[0]).toContain('items');
    });
});
