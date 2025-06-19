import { Injectable } from '@nestjs/common';
import { OrderService } from './order.service';
import { InventoryReservedEvent, InventoryReservationFailedEvent, OrderConfirmedEvent, OrderCancelledEvent } from '../../../core/events/events';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderStatus } from '../domain/order.entity';
import Opossum from 'opossum';
import { DlqService } from '../../dlq/domain/dlq.service';
import { retry } from '../../../core/retry.helper';

@Injectable()
export class InventoryReserveHandler {

    // NOTE: the circuit breaker needs to know the function parameters types
    private updateBreaker: Opossum<[string, OrderStatus, string?]>;

    constructor(
        private readonly orderService: OrderService,
        private readonly deadLetterQueueService: DlqService) {
        this.updateBreaker = new Opossum(this.updateOrderStatus.bind(this), {
            timeout: 3000,
            errorThresholdPercentage: 50,
            resetTimeout: 10000,
        });

        this.updateBreaker.on('open', () =>
            console.warn('Circuit breaker opened: Order updates are failing')
        );
        this.updateBreaker.on('close', () =>
            console.info('Circuit breaker closed: Order updates are succeeding')
        );
    }


    private async updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<void> {
        // force random errors
        // CAREFUL: this is unpredictable and breaks tests
        // if (Math.random() < 0.3) {
        //     throw new Error(`Random failure when updating order ${orderId}`);
        // }

        switch (status) {
            case 'CONFIRMED':
                await this.orderService.confirmOrder(orderId);
                break;
            case 'CANCELLED':
                await this.orderService.cancelOrder(orderId, reason);
                break;
            default:
                throw new Error(`Invalid order status: ${status}`);
        }
    }


    @OnEvent('InventoryReservedEvent')
    async onInventoryReserved(event: InventoryReservedEvent): Promise<void> {
        const { orderId } = event.payload;

        try {
            await retry<void>(async () => {
                await this.updateBreaker.fire(orderId, 'CONFIRMED', undefined);
            }, 3, 100, 50);
        } catch (error) {
            console.error(
                `[Order] Failed to update order ${orderId} to CONFIRMED after retries: ${(error as Error)?.message ?? 'Unknown error'}`
            );
            await this.deadLetterQueueService.send(event);
        }


    }

    @OnEvent('InventoryReservationFailedEvent')
    async onInventoryReservationFailed(event: InventoryReservationFailedEvent): Promise<void> {
        const { orderId } = event.payload;

        try {
            await retry<void>(async () => {
                await this.updateBreaker.fire(orderId, 'CANCELLED', event.payload?.reason as string ?? 'InventoryReservationFailed');
            }, 3, 100, 50);
        } catch (error) {
            console.error(
                `[Order] Failed to update order ${orderId} to CANCELLED after retries: ${(error as Error)?.message ?? 'Unknown error'}`
            );
            await this.deadLetterQueueService.send(event);
        }
    }
}
