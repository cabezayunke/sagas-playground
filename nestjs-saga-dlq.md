
Suggested Project Structure
```
nestjs-ddd-saga/
├── src/
│   ├── app.module.ts               # Global module registering all modules
│   ├── main.ts                     # Application bootstrap & microservice configuration
│   ├── rabbitmq.options.ts         # RabbitMQ transport options
│   │
│   ├── common/                     # Shared utilities, helpers, and base classes
│   │   ├── event-bus.service.ts    # In-memory event bus (or adapter for message bus)
│   │   └── retry.helper.ts         # Retry helper with jitter logic
│   │
│   ├── core/                       # Core domain concepts and shared domain events
│   │   └── events/
│   │       └── events.ts           # Domain event definitions (OrderCreatedEvent, etc.)
│   │
│   ├── modules/
│   │   ├── orders/                 # Orders bounded context
│   │   │   ├── domain/             # Domain layer: Entities, Aggregates, Value Objects
│   │   │   │   ├── order.entity.ts       # Order entity definition
│   │   │   │   └── order-status.enum.ts  # Order Status enumeration (PENDING, CONFIRMED, CANCELLED)
│   │   │   │
│   │   │   ├── application/        # Application layer: Use cases and services
│   │   │   │   ├── order.service.ts      # Business logic: creates orders, updates state
│   │   │   │   ├── order.controller.ts   # REST API endpoints for orders
│   │   │   │   └── order-saga.ts         # Saga for order-specific orchestration (reacts to domain events)
│   │   │   │
│   │   │   └── infrastructure/     # Infrastructure for orders: persistence, external integrations
│   │   │       └── order.repository.ts  # Example repository (in-memory for demonstration)
│   │   │
│   │   ├── inventory/              # Inventory bounded context
│   │   │   ├── domain/             # Domain layer: aggregates, value objects
│   │   │   │   └── inventory.aggregate.ts  # Simulated inventory aggregate
│   │   │   │
│   │   │   ├── application/        # Business logic
│   │   │   │   └── inventory.service.ts     # Inventory operations (reserve, release, commit)
│   │   │   │
│   │   │   └── infrastructure/     # Persistence and messaging for inventory (if needed)
│   │   │       └── inventory.repository.ts  # (Optional) Repository for inventory data
│   │   │
│   │   ├── dlq/                    # Dead-letter queue (DLQ) handling context
│   │   │   ├── infrastructure/
│   │   │   │   ├── dlq-event.schema.ts      # Mongoose schema for DLQ events
│   │   │   │   ├── dead-letter-queue.service.ts  # DLQ logic using Mongoose
│   │   │   │   ├── rabbitmq-dlq.service.ts  # RabbitMQ DLQ publisher (if you want to interact with RabbitMQ DLQ)
│   │   │   │   └── dlq-processor.service.ts  # Scheduled service polling the DLQ and reprocessing events
│   │   │
│   │   └── notifications/         # Cross-cutting external notifications
│   │       └── infrastructure/
│   │           └── slack-notification.service.ts  # Sends Slack alerts via webhook
│   │
│   └── modules.json                # (Optional) List or config of modules
│
├── package.json
├── tsconfig.json
└── README.md
```
Key Files Overview and Code Snippets

1. [main.ts](https://main.ts/)

Bootstraps the NestJS app, creates a microservice that uses RabbitMQ:
```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { rabbitMQOptions } from '../rabbitmq.options';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice(rabbitMQOptions);
  await app.startAllMicroservicesAsync();
  await app.listen(3000);
}
bootstrap();
```typescript

2. [rabbitmq.options.ts](https://rabbitmq.options.ts/)

Contains RabbitMQ configuration:
```typescript

// rabbitmq.options.ts
import { Transport, RmqOptions } from '@nestjs/microservices';

export const rabbitMQOptions: RmqOptions = {
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'main_queue',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'dlx_exchange',
      deadLetterRoutingKey: 'dead_letter_queue',
    },
  },
};
```typescript

3. [events.ts](https://events.ts/)

Definition of domain events:
```typescript

// src/events.ts
export interface DomainEvent {
  eventName: string;
  payload: any;
}

export class OrderCreatedEvent implements DomainEvent {
  eventName = 'OrderCreated';
  constructor(public payload: { orderId: string; items: any[] }) {}
}

export class OrderConfirmedEvent implements DomainEvent {
  eventName = 'OrderConfirmed';
  constructor(public payload: { orderId: string }) {}
}

export class OrderCancelledEvent implements DomainEvent {
  eventName = 'OrderCancelled';
  constructor(public payload: { orderId: string; reason?: string }) {}
}

export class InventoryReservedEvent implements DomainEvent {
  eventName = 'InventoryReserved';
  constructor(public payload: { orderId: string }) {}
}

export class InventoryReservationFailedEvent implements DomainEvent {
  eventName = 'InventoryReservationFailed';
  constructor(public payload: { orderId: string; reason: string }) {}
}
```typescript

4. [order.controller.ts](https://order.controller.ts/)

Expose an API endpoint for orders:
```typescript

// src/order.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(@Body() body: { items: any[] }) {
    // Implementation to create order and publish events
    // For instance, call orderService.createOrder(...)
    // For demonstration, simply return a success response.
    return { message: 'Order created' };
  }
}
```typescript

5. [order.service.ts](https://order.service.ts/)

Order bounded context with retry and circuit breaker integration:
```typescript

// src/order.service.ts
import { Injectable } from '@nestjs/common';
import * as Opossum from 'opossum';
import { OrderConfirmedEvent } from './events';
import { retry } from './retry.helper';
import { DeadLetterQueueService } from './dead-letter-queue.service';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Order {
  orderId: string;
  items: any[];
  status: OrderStatus;
}

@Injectable()
export class OrderService {
  private orders: Map<string, Order> = new Map();
  private updateBreaker: Opossum<typeof this.updateOrderStatus>;

  constructor(private readonly deadLetterQueueService: DeadLetterQueueService) {
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

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }
    // Simulate possibility of failure.
    if (Math.random() < 0.3) {
      throw new Error(`Random failure when updating order ${orderId}`);
    }
    order.status = status;
    console.log(`[Order] Order ${orderId} updated to ${status}.`);
  }

  async handleOrderConfirmedEvent(event: OrderConfirmedEvent): Promise<void> {
    const { orderId } = event.payload;
    try {
      await retry(async () => {
        await this.updateBreaker.fire(orderId, 'CONFIRMED');
      }, 3, 1000, 500);
    } catch (error) {
      console.error(
        `[Order] Failed to update order ${orderId} to CONFIRMED after retries: ${error.message}`
      );
      await this.deadLetterQueueService.add(new OrderConfirmedEvent({ orderId }));
    }
  }

  /**
   * Creates a new order in PENDING state and publishes an OrderCreatedEvent.
   */
  createOrder(orderId: string, items: any[]): Order {
    const newOrder: Order = {
      orderId,
      items,
      status: 'PENDING',
    };
    this.orders.set(orderId, newOrder);

    console.log(`[OrderService] Created order ${orderId} with status PENDING.`);
    this.eventBus.publish(new OrderCreatedEvent({ orderId, items }));

    return newOrder;
  }

  /**
   * Sets the order status to CONFIRMED.
   */
  confirmOrder(orderId: string): void {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    order.status = 'CONFIRMED';
    console.log(`[OrderService] Order ${orderId} confirmed.`);
  }

  /**
   * Sets the order status to CANCELLED.
   */
  cancelOrder(orderId: string, reason?: string): void {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    order.status = 'CANCELLED';
    console.log(`[OrderService] Order ${orderId} cancelled. Reason: ${reason || 'Not specified'}`);
  }

  /**
   * Helper method to retrieve an order by ID (optional but useful for queries or debug).
   */
  getOrderById(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }
}
```typescript

6. [retry.helper.ts](https://retry.helper.ts/)

Retry helper with jitter:
```typescript

// src/retry.helper.ts
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number,
  delay: number,
  jitter: number
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      const jitterValue = Math.floor(Math.random() * jitter);
      const waitTime = delay * attempt + jitterValue;
      console.error(
        `Attempt ${attempt} failed. Retrying in ${waitTime}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Operation failed after multiple attempts.');
}
```typescript

7. [inventory.service.ts](https://inventory.service.ts/)

Simple simulation of an inventory bounded context:
```typescript

// src/inventory.service.ts
import { Injectable } from '@nestjs/common';
import { OrderItem } from './events';

@Injectable()
export class InventoryService {
  private stock: Record<string, number> = {
    'product-1': 100,
    'product-2': 200,
  };

  async reserveInventory(items: any[]): Promise<boolean> {
    console.log('[Inventory] Attempting to reserve inventory...');
    for (const item of items) {
      const available = this.stock[item.productId] || 0;
      if (available < item.quantity) {
        console.log(`[Inventory] Insufficient stock for ${item.productId}`);
        return false;
      }
    }
    for (const item of items) {
      this.stock[item.productId] -= item.quantity;
    }
    console.log('[Inventory] Inventory reserved successfully.');
    return true;
  }
}
```typescript

8. [order-saga.ts](https://order-saga.ts/)

Implementation of a saga based on our generic Saga interface:
```typescript

// src/order-saga.ts
import { Injectable } from '@nestjs/common';
import { Saga } from './saga.interface';
import { DomainEvent, InventoryReservedEvent, InventoryReservationFailedEvent, OrderConfirmedEvent, OrderCancelledEvent } from './events';
import { EventBusService } from './event-bus.service';

@Injectable()
export class OrderSaga implements Saga {
  constructor(private readonly eventBus: EventBusService) {}

  canHandle(event: DomainEvent): boolean {
    return event.eventName === 'InventoryReserved' || event.eventName === 'InventoryReservationFailed';
  }

  async handle(event: DomainEvent): Promise<void> {
    if (event.eventName === 'InventoryReserved') {
      const { orderId } = event.payload;
      console.log(`[OrderSaga] Inventory reserved for order ${orderId}. Publishing OrderConfirmedEvent.`);
      this.eventBus.publish(new OrderConfirmedEvent({ orderId }));
    } else if (event.eventName === 'InventoryReservationFailed') {
      const { orderId, reason } = event.payload;
      console.log(`[OrderSaga] Inventory reservation failed for order ${orderId}: ${reason}. Publishing OrderCancelledEvent.`);
      this.eventBus.publish(new OrderCancelledEvent({ orderId, reason }));
    }
  }
}
```typescript

9. [saga.interface.ts](https://saga.interface.ts/)

Saga interface definition:
```typescript

// src/saga.interface.ts
import { DomainEvent } from './events';

export interface Saga {
  canHandle(event: DomainEvent): boolean;
  handle(event: DomainEvent): Promise<void>;
}
```typescript

10. [saga-orchestrator.service.ts](https://saga-orchestrator.service.ts/)

Generic orchestrator for sagas:
```typescript

// src/saga-orchestrator.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEvent } from './events';
import { EventBusService } from './event-bus.service';
import { Saga } from './saga.interface';

@Injectable()
export class SagaOrchestrator implements OnModuleInit {
  private sagas: Saga[] = [];

  constructor(private readonly eventBus: EventBusService) {}

  registerSaga(saga: Saga) {
    this.sagas.push(saga);
  }

  onModuleInit() {
    this.eventBus.subscribeAll((event: DomainEvent) => this.dispatch(event));
  }

  async dispatch(event: DomainEvent): Promise<void> {
    for (const saga of this.sagas) {
      if (saga.canHandle(event)) {
        await saga.handle(event);
      }
    }
  }
}
```typescript

11. [event-bus.service.ts](https://event-bus.service.ts/)

Simple in-memory event bus with global subscription support:
```typescript

// src/event-bus.service.ts
import { Injectable } from '@nestjs/common';
import { DomainEvent } from './events';

type EventHandler = (event: DomainEvent) => void;

@Injectable()
export class EventBusService {
  private handlers: Record<string, EventHandler[]> = {};
  private globalHandlers: EventHandler[] = [];

  publish(event: DomainEvent) {
    (this.handlers[event.eventName] || []).forEach(handler => handler(event));
    this.globalHandlers.forEach(handler => handler(event));
  }

  subscribe(eventName: string, handler: EventHandler) {
    this.handlers[eventName] = this.handlers[eventName] || [];
    this.handlers[eventName].push(handler);
  }

  subscribeAll(handler: EventHandler) {
    this.globalHandlers.push(handler);
  }
}
```typescript

12. [dlq-event.schema.ts](https://dlq-event.schema.ts/)

Mongoose schema for DLQ events:
```typescript

// src/dlq-event.schema.ts
import { Schema, Document } from 'mongoose';

export interface DlqEvent extends Document {
  eventName: string;
  payload: any;
  createdAt: Date;
  retryCount: number;
}

export const DlqEventSchema = new Schema({
  eventName: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  retryCount: { type: Number, default: 0 },
});
```typescript

13. [rabbitmq-dlq.service.ts](https://rabbitmq-dlq.service.ts/)

Service for handling RabbitMQ DLQ publishing:
```typescript

// src/rabbitmq-dlq.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';
import { rabbitMQOptions } from '../rabbitmq.options';

@Injectable()
export class RabbitMqDlqService {
  private client: ClientProxy;
  private readonly logger = new Logger(RabbitMqDlqService.name);

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: rabbitMQOptions.transport,
      options: {
        urls: rabbitMQOptions.options.urls,
        queue: 'dead_letter_queue',
      },
    });
  }

  async publish(event: any): Promise<void> {
    try {
      await this.client.emit<any>('dlq_event', event).toPromise();
      this.logger.log(`Published event to DLQ: ${JSON.stringify(event)}`);
    } catch (error) {
      this.logger.error('Failed to publish event to DLQ', error);
    }
  }
}
```typescript

14. [slack-notification.service.ts](https://slack-notification.service.ts/)

Service to send Slack notifications:
```typescript

// src/slack-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SlackNotificationService {
  private readonly logger = new Logger(SlackNotificationService.name);
  private readonly slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/your/webhook/url';

  async sendNotification(message: string): Promise<void> {
    try {
      await axios.post(this.slackWebhookUrl, { text: message });
      this.logger.log(`Slack notification sent: ${message}`);
    } catch (error) {
      this.logger.error('Failed to send Slack notification', error);
    }
  }
}
```typescript

15. [dlq-processor.service.ts](https://dlq-processor.service.ts/)

DLQ processor service using RabbitMQ and Slack notifications:
```typescript

// src/dlq-processor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RabbitMqDlqService } from './rabbitmq-dlq.service';
import { OrderService } from './order.service';
import { DomainEvent, OrderConfirmedEvent } from './events';
import { SlackNotificationService } from './slack-notification.service';

@Injectable()
export class DlqProcessorService {
  private readonly logger = new Logger(DlqProcessorService.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly slackService: SlackNotificationService,
    private readonly rabbitMqDlqService: RabbitMqDlqService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processDlq(): Promise<void> {
    this.logger.log('Starting DLQ processing...');
    const failedEvents: DomainEvent[] = await this.getFailedEventsFromDlq();

    if (failedEvents.length === 0) {
      this.logger.log('No events in DLQ.');
      return;
    }

    for (const event of failedEvents) {
      this.logger.log(`Reprocessing event ${event.eventName} for Order ID ${event.payload.orderId}`);
      try {
        if (event.eventName === 'OrderConfirmed') {
          await this.orderService.handleOrderConfirmedEvent(
            new OrderConfirmedEvent({ orderId: event.payload.orderId })
          );
        }
        this.logger.log(`Processed event for Order ${event.payload.orderId} successfully.`);
      } catch (error) {
        this.logger.error(`Reprocessing failed for event ${event.eventName}: ${error.message}`);
        await this.slackService.sendNotification(
          `DLQ reprocess failure: ${event.eventName} for Order ${event.payload.orderId} still failing.`
        );
      }
    }
  }

  private async getFailedEventsFromDlq(): Promise<DomainEvent[]> {
    // Implement DLQ consumption logic from RabbitMQ.
    // For demonstration, this might involve a consumer that pulls messages,
    // or a stream from your RabbitMqDlqService.
    return [];
  }
}
```typescript

16. [app.module.ts](https://app.module.ts/)

Wiring everything up in the AppModule:
```typescript

// src/app.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { InventoryService } from './inventory.service';
import { EventBusService } from './event-bus.service';
import { SagaOrchestrator } from './saga-orchestrator.service';
import { OrderSaga } from './order-saga';
import { DeadLetterQueueService } from './dead-letter-queue.service';
import { SlackNotificationService } from './slack-notification.service';
import { DlqProcessorService } from './dlq-processor.service';
import { RabbitMqDlqService } from './rabbitmq-dlq.service';
import { DlqEventSchema } from './dlq-event.schema';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/your-db-name'),
    MongooseModule.forFeature([{ name: 'DlqEvent', schema: DlqEventSchema }]),
    ScheduleModule.forRoot(),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    InventoryService,
    EventBusService,
    SagaOrchestrator,
    OrderSaga,
    DeadLetterQueueService,
    SlackNotificationService,
    RabbitMqDlqService,
    DlqProcessorService,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly sagaOrchestrator: SagaOrchestrator,
    private readonly orderSaga: OrderSaga,
  ) {}

  onModuleInit() {
    this.sagaOrchestrator.registerSaga(this.orderSaga);
  }
}
```typescript

## Next Steps

** Local Setup: **

- Create a new repository on GitHub.

- Clone it locally.

- Drop the code files based on the structure above.

- Make sure to install dependencies such as:
```
npm install @nestjs/common @nestjs/core @nestjs/mongoose @nestjs/microservices @nestjs/schedule mongoose axios opossum
```
- Configure your RabbitMQ instance and MongoDB connection string.

- Set your Slack webhook URL in an environment variable (SLACK_WEBHOOK_URL).

- Push to GitHub:

- Initialize a Git repository, commit your code, and push it to your remote repository.

This should provide you with a solid starting point that gathers all our discussion into one cohesive project. If you have any additional customization or integration needs, feel free to ask! Done — the OrderService class is now beautifully formatted with syntax highlighting and proper indentation in your NestJS DDD Saga Project Guide page. It should be much easier to read and follow now.

Let me know if you'd like the same treatment for any other code snippets — happy to spruce them up! 🌟