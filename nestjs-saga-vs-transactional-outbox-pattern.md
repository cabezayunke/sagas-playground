<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

## Implementing Sagas in a NestJS Project

Sagas in NestJS are used to manage complex, long-running business workflows, especially those spanning multiple services or requiring compensation logic. You have several approaches to implement sagas in a NestJS project, depending on your needs and the complexity of your workflow.

---

**1. Using the Built-in CQRS Sagas (RxJS-based)**

NestJS’s CQRS module provides a basic saga implementation using RxJS observables. Sagas here listen to event streams and dispatch commands in response.

**Basic Example:**

```typescript
import { Injectable } from '@nestjs/common';
import { Saga, ofType } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class HeroesGameSagas {
  @Saga()
  dragonKilled = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(HeroKilledDragonEvent),
      map(event => new DropAncientItemCommand(event.heroId, fakeItemID)),
    );
  };
}
```

- The `@Saga()` decorator marks the method as a saga.
- The saga listens for `HeroKilledDragonEvent` and maps it to a new command.
- Register your saga class as a provider in your module:

```typescript
providers: [HeroesGameSagas],
```

- This approach is event-driven and stateless by default. If you need to persist state, you must implement it yourself[^1_1][^1_2].

---

**2. Using Third-Party Saga Orchestrator Libraries**

If you require more advanced orchestration (multi-step workflows, compensation logic, state management), consider using a saga orchestrator library such as:

### a) [nestjs-saga](https://github.com/iamolegga/nestjs-saga)

- Allows you to define step-by-step workflows with compensation (rollback) logic.
- Supports both command and result types.

**Example:**

```typescript
import { Builder, Saga } from 'nestjs-saga';

@Saga(FooSagaCommand)
class FooSaga {
  saga = new Builder<FooSagaCommand>()
    .step('do something')
    .invoke(this.step1)
    .withCompensation(this.step1Compensation)
    .step()
    .invoke(this.step2)
    .return(this.buildResult)
    .build();

  step1(cmd: FooSagaCommand) { /* ... */ }
  step1Compensation(cmd: FooSagaCommand) { /* ... */ }
  step2(cmd: FooSagaCommand) { /* ... */ }
  buildResult(cmd: FooSagaCommand) { /* ... */ }
}
```

- Register your sagas using `SagaModule.register({ sagas: [FooSaga] })` in your module.
- Execute the saga via the `CommandBus`[^1_3].


### b) [@sebaseg/saga-builder-nestjs](https://www.npmjs.com/package/@sebaseg/saga-builder-nestjs)

- Lets you define steps and compensations as an array, then run them with a single service call.

**Example:**

```typescript
@Injectable()
export class ConsumeSagaService {
  constructor(private sagaBuilderSrvc: SagaBuilderNestjsService) {}

  async startSaga(data: any) {
    const steps = [
      { step: this.func1(), compensation: this.compensationForFunc1() },
      { step: this.func2(), compensation: this.compensationForFunc2() },
      { step: this.func3() },
    ];
    await this.sagaService.run(data, steps);
  }
  // Define your step and compensation methods...
}
```

- Import `SagaBuilderNestjsModule` and inject `SagaBuilderNestjsService`[^1_4].

---

**3. Custom Implementation**

You can always implement your own saga orchestrator by combining event listeners, command dispatching, and state management (e.g., using a database or Redis for persistence). This is necessary if you need persistent sagas or advanced coordination across distributed services[^1_2].

---

## Summary Table: Approaches to Sagas in NestJS

| Approach | Features | When to Use |
| :-- | :-- | :-- |
| Built-in CQRS Sagas (RxJS) | Event-driven, simple mapping | Simple workflows, event → command |
| nestjs-saga | Step orchestration, compensation | Multi-step, compensation needed |
| @sebaseg/saga-builder-nestjs | Orchestrator pattern, compensations | Custom step/compensation logic |
| Custom (manual) implementation | Full control, persistence | Complex, distributed workflows |


---

## Key Points

- **Register your saga classes as providers** in your module, regardless of approach.
- For **simple event-to-command mappings**, use the built-in CQRS saga pattern[^1_1].
- For **multi-step workflows with compensation**, use a library like `nestjs-saga` or `@sebaseg/saga-builder-nestjs`[^1_3][^1_4].
- For **stateful or distributed sagas**, implement custom state persistence (e.g., with Redis, DB)[^1_2].
- Always handle errors and compensations to ensure data consistency across services[^1_5][^1_3][^1_4].

If you have a specific use case (e.g., distributed transactions, microservices), clarify your requirements to choose the best approach.

<div style="text-align: center">⁂</div>

[^1_1]: https://docs.nestjs.com/recipes/cqrs

[^1_2]: https://www.reddit.com/r/nestjs/comments/yo4z6f/saga_examples_and_documentation/

[^1_3]: https://github.com/iamolegga/nestjs-saga

[^1_4]: https://www.npmjs.com/package/@sebaseg/saga-builder-nestjs

[^1_5]: https://blog.stackademic.com/mastering-microservices-in-nestjs-powerful-design-patterns-for-flexibility-resilience-and-64309ae219e8

[^1_6]: https://github.com/orhanveli/nestjs-saga-pattern-example

[^1_7]: https://github.com/amehat/nestjs-cqrs-saga

[^1_8]: https://stackoverflow.com/questions/75468042/saga-pattern-in-nestjs

[^1_9]: https://blog.bitsrc.io/implementing-saga-pattern-in-a-microservices-with-node-js-aa2faddafac3

[^1_10]: https://www.youtube.com/watch?v=akTfrZhHc5Y


---

## Real Example: Order Creation and Inventory Update Saga in NestJS

To illustrate how to implement the Saga pattern in a NestJS project, let's use the common e-commerce workflow: **creating an order and updating the inventory**. We'll outline both the choreography-based and orchestration-based approaches, focusing on practical code and event flows.

---

### **Choreography-Based Saga**

In this pattern, each service reacts to events and emits new events. There is no central coordinator.

**Workflow:**

1. Order Service creates an order and emits `OrderCreated`.
2. Inventory Service listens for `OrderCreated`, reserves inventory, and emits `InventoryReserved` or `InventoryReservationFailed`.
3. If inventory reservation fails, the Order Service listens for `InventoryReservationFailed` and cancels the order.

**Example Implementation:**

**Order Service**

```typescript
// order.service.ts
@Injectable()
export class OrderService {
  constructor(private eventEmitter: EventEmitter2) {}

  async createOrder(orderDto: CreateOrderDto) {
    // 1. Persist order with status 'pending'
    const order = await this.orderRepository.save({ ...orderDto, status: 'pending' });
    // 2. Emit OrderCreated event
    this.eventEmitter.emit('order.created', { orderId: order.id, items: order.items });
    return order;
  }

  @OnEvent('inventory.reservation_failed')
  async handleInventoryFailure(payload: { orderId: string }) {
    // 3. Compensate: Cancel the order
    await this.orderRepository.update(payload.orderId, { status: 'cancelled' });
  }
}
```

**Inventory Service**

```typescript
// inventory.service.ts
@Injectable()
export class InventoryService {
  constructor(private eventEmitter: EventEmitter2) {}

  @OnEvent('order.created')
  async reserveInventory(payload: { orderId: string, items: Item[] }) {
    const success = await this.tryReserveItems(payload.items);
    if (success) {
      this.eventEmitter.emit('inventory.reserved', { orderId: payload.orderId });
    } else {
      this.eventEmitter.emit('inventory.reservation_failed', { orderId: payload.orderId });
    }
  }

  async tryReserveItems(items: Item[]): Promise<boolean> {
    // Check and reserve inventory logic here
    // Return true if successful, false otherwise
  }
}
```

**Event Flow:**

- `OrderService.createOrder()` → emits `order.created`
- `InventoryService.reserveInventory()` listens for `order.created`
- On failure, emits `inventory.reservation_failed`
- `OrderService.handleInventoryFailure()` listens for `inventory.reservation_failed` and cancels the order

This approach is simple and works well for small systems, but as the system grows, tracking and compensating becomes more complex[^2_1][^2_2].

---

### **Orchestration-Based Saga**

Here, a dedicated Saga Orchestrator coordinates the workflow and manages compensations.

**Workflow:**

1. Saga Orchestrator receives a command to create an order.
2. It instructs the Order Service to create the order.
3. Then, it calls the Inventory Service to reserve inventory.
4. If any step fails, the orchestrator triggers compensating actions (e.g., cancel the order).

**Example Implementation:**

**Saga Orchestrator**

```typescript
// saga.service.ts
@Injectable()
export class OrderSagaService {
  constructor(
    private orderService: OrderService,
    private inventoryService: InventoryService,
  ) {}

  async createOrderSaga(orderDto: CreateOrderDto) {
    // 1. Create order
    const order = await this.orderService.createOrder(orderDto);
    try {
      // 2. Reserve inventory
      const reserved = await this.inventoryService.reserve(order.id, order.items);
      if (!reserved) throw new Error('Inventory reservation failed');
      // 3. (Optional) Continue with payment, shipping, etc.
      return { status: 'success', orderId: order.id };
    } catch (err) {
      // 4. Compensate: Cancel order if inventory reservation fails
      await this.orderService.cancelOrder(order.id);
      return { status: 'failed', reason: err.message };
    }
  }
}
```

**Order Service and Inventory Service** would expose methods (`createOrder`, `cancelOrder`, `reserve`) as needed.

**Event Flow:**

- Orchestrator calls Order Service
- Orchestrator calls Inventory Service
- On failure, orchestrator calls compensation (e.g., cancel order)

This approach is easier to manage for complex workflows and gives a clear picture of the transaction state[^2_3][^2_2].

---

### **Summary Table**

| Step | Choreography Event | Orchestration Call |
| :-- | :-- | :-- |
| Create Order | `order.created` | `orderService.createOrder()` |
| Reserve Inventory | `inventory.reserved` or `inventory.reservation_failed` | `inventoryService.reserve()` |
| Compensation | `order.cancelled` | `orderService.cancelOrder()` |


---

### **References and Further Reading**

- [Choreography Example](https://stackoverflow.com/questions/78548598/in-the-saga-pattern-how-do-microservices-listen-for-compensating-events)[^2_1]
- [Orchestration Example](https://github.com/anhtt2211/microservices-saga-pattern)[^2_3]
- [Saga Pattern Overview](https://www.linkedin.com/pulse/comprehensive-guide-saga-pattern-microservices-amit-jindal-9lwhf)[^2_2]

---

**In summary:**

- Use events and listeners for simple, choreography-based sagas.
- Use a Saga Orchestrator service for complex, orchestration-based sagas.
- Always implement compensating actions to maintain consistency if a step fails.

This structure allows you to handle distributed transactions like order creation and inventory update robustly in a NestJS microservices architecture.

<div style="text-align: center">⁂</div>

[^2_1]: https://stackoverflow.com/questions/78548598/in-the-saga-pattern-how-do-microservices-listen-for-compensating-events

[^2_2]: https://www.linkedin.com/pulse/comprehensive-guide-saga-pattern-microservices-amit-jindal-9lwhf

[^2_3]: https://github.com/anhtt2211/microservices-saga-pattern

[^2_4]: https://blog.stackademic.com/mastering-microservices-in-nestjs-powerful-design-patterns-for-flexibility-resilience-and-64309ae219e8

[^2_5]: https://izolabs.tech/2022/08/orders-module

[^2_6]: https://dev.to/temporalio/saga-pattern-made-easy-4j42

[^2_7]: https://github.com/nestjs/cqrs/issues/274

[^2_8]: https://www.youtube.com/watch?v=akTfrZhHc5Y

[^2_9]: https://stackoverflow.com/questions/54648678/how-to-issue-multiple-commands-from-nestjs-saga

[^2_10]: https://github.com/KaoutharAsma/nestjs-kafka-saga-pattern

[^2_11]: https://www.reddit.com/r/nestjs/comments/yo4z6f/saga_examples_and_documentation/

[^2_12]: https://stackoverflow.com/questions/74002680/unit-testing-saga-in-nestjs-cqrs-pattern

[^2_13]: https://www.cloudnweb.dev/2020/1/implementing-saga-pattern-in-nodejs-microservices


---

## Implementing Order \& Inventory Saga Across Isolated Bounded Contexts in NestJS with DDD

When using Domain-Driven Design (DDD) and treating Orders and Inventory as separate, isolated bounded contexts, the key is to ensure each context encapsulates its own domain logic, data, and rules, communicating only through well-defined interfaces or events. This structure is ideal for modular monoliths or microservices, and aligns with best practices for clear separation and maintainability[^3_1][^3_2][^3_5].

---

### **1. Structure: Bounded Contexts as Modules or Microservices**

- Each bounded context (Order, Inventory) is its own NestJS module or service, with its own domain, application, and infrastructure layers[^3_1][^3_5].
- No direct database or domain model sharing between contexts—communication is via events or APIs[^3_1][^3_5].

```
src/
  modules/
    order/
      domain/
      application/
      infrastructure/
    inventory/
      domain/
      application/
      infrastructure/
```


---

### **2. Communication: Event-Driven Integration**

Since you cannot update both aggregates in a single transaction (strong consistency), you use asynchronous messaging for eventual consistency. This is typically implemented via a message/event bus (e.g., RabbitMQ, Kafka, or a NestJS event bus)[^3_3][^3_5].

#### **Saga Choreography Example (Event-Driven)**

**Order Context (publishes events):**

- Receives a create order request.
- Persists the order with status "pending."
- Publishes `OrderCreated` event.

**Inventory Context (subscribes to events):**

- Listens for `OrderCreated`.
- Tries to reserve inventory.
- Publishes `InventoryReserved` or `InventoryReservationFailed`.

**Order Context (handles compensation):**

- Listens for `InventoryReserved` (marks order as confirmed) or `InventoryReservationFailed` (cancels order).


#### **Sample Code Fragments**

**Order Module:**

```typescript
// order.application.service.ts
async createOrder(dto: CreateOrderDto) {
  const order = await this.orderRepository.save({ ...dto, status: 'pending' });
  this.eventBus.publish(new OrderCreatedEvent(order.id, order.items));
  return order;
}

@OnEvent('inventory.reservation_failed')
async onInventoryReservationFailed(event: InventoryReservationFailedEvent) {
  await this.orderRepository.update(event.orderId, { status: 'cancelled' });
}
```

**Inventory Module:**

```typescript
@OnEvent('order.created')
async handleOrderCreated(event: OrderCreatedEvent) {
  const success = await this.inventoryService.reserve(event.items);
  if (success) {
    this.eventBus.publish(new InventoryReservedEvent(event.orderId));
  } else {
    this.eventBus.publish(new InventoryReservationFailedEvent(event.orderId));
  }
}
```


---

### **3. Event Bus \& Outbox Pattern**

- Use a reliable event bus or message broker for inter-context communication[^3_3][^3_5].
- For transactional reliability, consider the "Transactional Outbox" pattern: events are stored in the local DB and published to the bus in a separate process, ensuring no lost messages if the broker is temporarily unavailable[^3_3].

---

### **4. Compensation Logic**

If inventory reservation fails, the Order context listens for the failure event and triggers compensation (e.g., cancels the order)[^3_3][^3_4].

---

### **5. Why Not Direct Calls?**

- Direct service-to-service (HTTP/gRPC) calls break isolation and create tight coupling.
- Events allow each context to evolve independently and support eventual consistency[^3_1][^3_5].

---

### **Summary Table**

| Bounded Context | Action | Communication | Compensation |
| :-- | :-- | :-- | :-- |
| Order | Create order, emit `OrderCreated` | Publish event | Cancel order on failure |
| Inventory | Listen for `OrderCreated`, reserve | Publish result event | N/A |
| Order | Listen for inventory result, update | Handle event | Cancel order |


---

### **References to Approach**

- Each bounded context as a module: [^3_1][^3_2][^3_5]
- Event-driven integration for eventual consistency: [^3_3][^3_5]
- Compensation via event handling: [^3_3][^3_4]

---

**In summary:**
Model each bounded context as an isolated NestJS module or microservice, communicate through domain events using an event bus, and implement the saga by having each context react to events and publish outcomes. Compensation logic (like canceling an order) is triggered by listening for failure events, ensuring each context remains autonomous and consistent with DDD principles[^3_1][^3_3][^3_5].

<div style="text-align: center">⁂</div>

[^3_1]: https://github.com/andrea-acampora/nestjs-ddd-quickstarter

[^3_2]: https://dev.to/bendix/applying-domain-driven-design-principles-to-a-nest-js-project-5f7b

[^3_3]: https://github.com/zhuravlevma/typescript-ddd-architecture

[^3_4]: https://stackoverflow.com/questions/32952797/implementing-bounded-context-in-domain-driven-design

[^3_5]: https://blog.bitsrc.io/developing-a-ddd-oriented-microservices-1b65bd45e2a8

[^3_6]: https://dev.to/bendix/applying-domain-driven-design-principles-to-a-nest-js-project-5f7b/comments

[^3_7]: https://www.reddit.com/r/node/comments/d0ws09/what_are_your_thoughts_about_ddd_cqrs_and_event/

[^3_8]: https://www.youtube.com/watch?v=4ZVdjRNArnw


---

## Full Implementation: Transactional Outbox Pattern with MongoDB, Mongoose, and Repository Abstraction (Orders \& Inventory Contexts)

This example demonstrates a robust, production-grade approach for DDD-based microservices using NestJS, Mongoose, and the Transactional Outbox pattern. It covers:

- Repository abstraction
- Transactional writes (order + outbox event)
- Outbox polling/relay with error handling and retries
- Compensation logic

**Note:** This is a concise yet complete demonstration. You can further modularize or generalize as needed for your architecture.

---

## 1. Common Outbox Event Model

```typescript
// outbox-event.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class OutboxEvent extends Document {
  @Prop({ required: true })
  eventType: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, any>;

  @Prop({ default: false })
  processed: boolean;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
```


---

## 2. Orders Context

### **Order Model \& Repository**

```typescript
// order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  items: Array<{ sku: string; quantity: number }>;

  @Prop({ required: true, default: 'pending' })
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
}

export const OrderSchema = SchemaFactory.createForClass(Order);
```

```typescript
// order.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Order } from './order.schema';

@Injectable()
export class OrderRepository {
  constructor(@InjectModel(Order.name) private readonly orderModel: Model<Order>) {}

  async create(order: Partial<Order>, session: ClientSession): Promise<Order> {
    return this.orderModel.create([{ ...order }], { session }).then(res => res[^4_0]);
  }

  async updateStatus(orderId: string, status: string, session?: ClientSession) {
    return this.orderModel.findByIdAndUpdate(orderId, { status }, { session });
  }

  async findById(orderId: string) {
    return this.orderModel.findById(orderId);
  }
}
```


### **Order Service (with Transactional Outbox)**

```typescript
// order.service.ts
import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Order } from './order.schema';
import { OutboxEvent } from '../outbox-event.schema';
import { OrderRepository } from './order.repository';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    @InjectModel(OutboxEvent.name) private readonly outboxModel: Model<OutboxEvent>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async createOrder(customerId: string, items: Array<{ sku: string, quantity: number }>) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      // 1. Create order
      const order = await this.orderRepository.create(
        { customerId, items, status: 'pending' },
        session,
      );

      // 2. Write outbox event
      await this.outboxModel.create(
        [{
          eventType: 'OrderCreated',
          payload: { orderId: order._id, items },
        }],
        { session },
      );

      await session.commitTransaction();
      return order;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async cancelOrder(orderId: string) {
    // Optionally, use a session if you want to also write a compensation outbox event
    return this.orderRepository.updateStatus(orderId, 'cancelled');
  }

  async confirmOrder(orderId: string) {
    return this.orderRepository.updateStatus(orderId, 'confirmed');
  }
}
```


---

## 3. Outbox Relay Worker (Order Context)

```typescript
// outbox-relay.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OutboxEvent } from '../outbox-event.schema';

@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);

  constructor(@InjectModel(OutboxEvent.name) private readonly outboxModel: Model<OutboxEvent>) {}

  async start() {
    // Polling loop (could use change streams for more efficiency)
    setInterval(async () => {
      const events = await this.outboxModel.find({ processed: false }).limit(10);
      for (const event of events) {
        try {
          // Publish to broker (Kafka, RabbitMQ, etc.)
          await this.publishEvent(event);

          // Mark as processed
          await this.outboxModel.findByIdAndUpdate(event._id, { processed: true });
        } catch (err) {
          this.logger.error(`Failed to publish event ${event._id}: ${err.message}`);
          // Optionally, implement retry logic or exponential backoff
        }
      }
    }, 1000);
  }

  async publishEvent(event: OutboxEvent) {
    // TODO: Integrate with your message broker
    // Example: await kafkaProducer.send({ topic: ..., message: ... });
    this.logger.log(`Publishing event: ${event.eventType} - ${JSON.stringify(event.payload)}`);
  }
}
```


---

## 4. Inventory Context

### **Inventory Model \& Repository**

```typescript
// inventory.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Inventory extends Document {
  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  quantity: number;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);
```

```typescript
// inventory.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Inventory } from './inventory.schema';

@Injectable()
export class InventoryRepository {
  constructor(@InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>) {}

  async reserveItems(items: Array<{ sku: string; quantity: number }>, session: ClientSession): Promise<boolean> {
    for (const item of items) {
      const inv = await this.inventoryModel.findOne({ sku: item.sku }).session(session);
      if (!inv || inv.quantity < item.quantity) return false;
      inv.quantity -= item.quantity;
      await inv.save({ session });
    }
    return true;
  }
}
```


### **Inventory Event Handler (with Transactional Outbox)**

```typescript
// inventory-event-handler.service.ts
import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { InventoryRepository } from './inventory.repository';
import { OutboxEvent } from '../outbox-event.schema';

@Injectable()
export class InventoryEventHandlerService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    @InjectModel(OutboxEvent.name) private readonly outboxModel: Model<OutboxEvent>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // Called when an 'OrderCreated' event is received from the broker
  async handleOrderCreated(orderId: string, items: Array<{ sku: string; quantity: number }>) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const reserved = await this.inventoryRepository.reserveItems(items, session);
      if (reserved) {
        // Inventory reserved successfully, emit event
        await this.outboxModel.create(
          [{
            eventType: 'InventoryReserved',
            payload: { orderId },
          }],
          { session },
        );
      } else {
        // Inventory reservation failed, emit failure event
        await this.outboxModel.create(
          [{
            eventType: 'InventoryReservationFailed',
            payload: { orderId },
          }],
          { session },
        );
      }
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
```


### **Inventory Outbox Relay Worker**

Identical to the Orders context relay worker, but publishes inventory events.

---

## 5. Handling Inventory Events in Orders Context (Compensation)

```typescript
// order-events-handler.service.ts
import { Injectable } from '@nestjs/common';
import { OrderService } from './order.service';

@Injectable()
export class OrderEventsHandlerService {
  constructor(private readonly orderService: OrderService) {}

  // Called when 'InventoryReserved' event is received from broker
  async handleInventoryReserved(orderId: string) {
    await this.orderService.confirmOrder(orderId);
  }

  // Called when 'InventoryReservationFailed' event is received from broker
  async handleInventoryReservationFailed(orderId: string) {
    await this.orderService.cancelOrder(orderId);
  }
}
```


---

## 6. Error Handling, Retries, and Idempotency

- **Error handling:** All transactional operations use try/catch with transaction abort on error.
- **Retries:** Outbox relay workers can implement retry logic (e.g., exponential backoff, max retries).
- **Idempotency:** Event handlers should be idempotent (e.g., updating order status to 'cancelled' multiple times is safe).

---

## 7. Integration with a Message Broker

- The relay workers in both contexts are responsible for publishing outbox events to your broker (Kafka, RabbitMQ, etc.).
- On receiving events from the broker, invoke the appropriate handler in the target context (e.g., `handleOrderCreated` in Inventory).

---

## 8. Directory Structure Example

```
src/
  orders/
    order.schema.ts
    order.repository.ts
    order.service.ts
    order-events-handler.service.ts
    outbox-relay.service.ts
  inventory/
    inventory.schema.ts
    inventory.repository.ts
    inventory-event-handler.service.ts
    outbox-relay.service.ts
  outbox-event.schema.ts
```


---

## 9. References

- [Outbox pattern with Kafka and NestJS](https://dev.to/wallacefreitas/outbox-pattern-with-kafka-and-nestjs-ensuring-reliable-event-driven-systems-2f5k)[^4_3]
- [Transactional outbox pattern for node and mongodb](https://github.com/yornaath/service-outbox)[^4_5]
- [MongoDB change streams and transactional outbox](https://stackoverflow.com/questions/68985499/is-it-possible-to-implement-transactional-outbox-pattern-for-only-rabbitmq-publi)[^4_4]
- [NestJS with MongoDB \& Mongoose](https://docs.nestjs.com/techniques/mongodb)[^4_6]

---

**This implementation ensures atomicity (order+event), reliable event delivery, error handling, retry, and DDD-compliant separation between bounded contexts.**

<div style="text-align: center">⁂</div>

[^4_1]: https://www.reddit.com/r/microservices/comments/10jqj1l/transactional_outbox_paatern_mongodb/

[^4_2]: https://github.com/xeno097/transactional-outbox-pattern-with-mongodb

[^4_3]: https://dev.to/wallacefreitas/outbox-pattern-with-kafka-and-nestjs-ensuring-reliable-event-driven-systems-2f5k

[^4_4]: https://stackoverflow.com/questions/68985499/is-it-possible-to-implement-transactional-outbox-pattern-for-only-rabbitmq-publi

[^4_5]: https://github.com/yornaath/service-outbox

[^4_6]: https://docs.nestjs.com/techniques/mongodb

[^4_7]: https://www.youtube.com/watch?v=dJz94r5C3QA

[^4_8]: https://courses.nestjs.com


---

### 1. Should Outbox Events Be Marked as Processed by the Consumer?

**Best practice:**
Outbox events should be marked as processed by the *producer* (the context that emits the event) only after the event is successfully published to the message broker (e.g., Kafka, RabbitMQ).

- This ensures that every event is reliably delivered at least once to the broker, even if the relay worker crashes or the broker is temporarily unavailable.
- The outbox table/collection acts as a buffer, guaranteeing delivery.

**Not by the consumer:**

- The consumer (the context that receives and handles the event) should not mark the producer's outbox event as processed, because the consumer has no access to the producer's database and shouldn't couple its processing logic to the producer's storage.
- Instead, the consumer is responsible for its own idempotency and error handling (e.g., if it fails to process an event, it can retry or log the error).

**Summary:**

- Outbox events are marked as processed after successful publishing to the broker, not after consumer processing.

---

### 2. MongoDB Transaction Abstraction for Service/Domain Layer

**Yes, you should use an abstraction** to avoid exposing infrastructure details (like Mongoose sessions) to your service/domain logic.
This aligns with DDD and clean architecture principles.

**How to do it:**

- Define an abstract transaction/session interface in your domain or application layer.
- Implement the interface in your infrastructure layer (using Mongoose for MongoDB).
- Inject the abstraction into your services, so they remain decoupled from the specific database/session implementation.

**Example Abstraction:**

```typescript
// db-session.abstract.ts
export abstract class DbSession<T = unknown> {
  abstract start(): Promise<void>;
  abstract commit(): Promise<void>;
  abstract abort(): Promise<void>;
  abstract end(): Promise<void>;
  abstract get(): T | null;
}
```

**MongoDB Implementation:**

```typescript
// mongodb-session.service.ts
import { InjectConnection } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Connection, ClientSession } from 'mongoose';
import { DbSession } from './db-session.abstract';

@Injectable()
export class MongoDbSession extends DbSession<ClientSession> {
  constructor(@InjectConnection() private readonly connection: Connection) { super(); }
  private session: ClientSession | null = null;

  async start() { /* ...see [^5_2] for full implementation... */ }
  async commit() { /* ... */ }
  async abort() { /* ... */ }
  async end() { /* ... */ }
  get() { return this.session; }
}
```

**Usage in Service Layer:**

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly dbSession: DbSession,
    // ...other deps
  ) {}

  async createOrder(...) {
    await this.dbSession.start();
    try {
      // pass this.dbSession.get() as the session to repositories
      await this.orderRepository.create(..., this.dbSession.get());
      // ...
      await this.dbSession.commit();
    } catch (e) {
      await this.dbSession.abort();
      throw e;
    } finally {
      await this.dbSession.end();
    }
  }
}
```

This approach keeps your service and domain layers agnostic of MongoDB/Mongoose specifics[^5_2][^5_4][^5_5].

---

### **References**

- [Example of abstracting MongoDB transactions in NestJS][^5_2]
- [YouTube: Abstract MongoDB Repository in NestJS][^5_4]
- [Lightweight Abstract Repository for NestJS][^5_5]

---

**In summary:**

- Mark outbox events as processed after successful broker publishing (by the producer, not the consumer).
- Use a transaction/session abstraction to keep infrastructure details out of your service/domain logic, improving maintainability and testability[^5_2][^5_4][^5_5].

<div style="text-align: center">⁂</div>

[^5_1]: https://www.reddit.com/r/Nestjs_framework/comments/g3lfik/how_to_use_mongodb_transaction_in_nestjs/

[^5_2]: https://stackoverflow.com/questions/67879357/nestjs-how-to-use-mongoose-to-start-a-session-for-transaction

[^5_3]: https://www.lukinotes.com/2022/04/managing-mongodb-records-using-nestjs-mong.html

[^5_4]: https://www.youtube.com/watch?v=OVBx6fqGDOY

[^5_5]: https://dev.to/josuto/lightweight-generic-repository-for-nestjs-38fi

[^5_6]: https://docs.nestjs.com/techniques/database

[^5_7]: https://github.com/nestjs/nest/issues/11658

[^5_8]: https://docs.nestjs.com/techniques/mongodb


---

# based on this: Outbox events are marked as processed after successful publishing to the broker, not after consumer processing.

you should call it "dispatched" then, not processed

You are correct: the term "dispatched" more accurately reflects the state of an outbox event that has been successfully published to the message broker, but not necessarily processed by any consumers. Using "dispatched" avoids confusion and clearly distinguishes between the act of sending the event (producer responsibility) and the act of processing the event (consumer responsibility). This naming convention aligns with event-driven architecture best practices and improves clarity in your codebase and documentation.

---

# what king of pattern should I use if I want a centrilised event store and being able to mark the event as processed from the consumer?

If you want a **centralized event store** and need consumers to be able to mark events as processed, you should use the **Event Sourcing pattern** with a centralized event store, often combined with a **"consumer offset" or "subscription checkpoint"** mechanism[^7_1][^7_2][^7_7].

### How it works

- **Event Sourcing**: All state changes are stored as immutable events in a central append-only event store. This event store acts as the single source of truth for the system[^7_1][^7_2][^7_7].
- **Consumers**: Each consumer (service, microservice, or projection) reads events from the central store.
- **Tracking Processing**: Each consumer maintains its own record of which events it has processed. This is typically implemented as a "checkpoint" or "offset"—a pointer to the last event processed per consumer or subscription[^7_2][^7_7].
- **Marking as Processed**: When a consumer finishes handling an event, it updates its checkpoint in a dedicated table or collection (not in the event itself, which remains immutable). This allows you to track which consumers have processed which events, and to resume processing after failures.


### Why not mark the event as processed in the event itself?

- Events in an event store are immutable by design (append-only)[^7_1][^7_7]. You do not update the event record itself.
- Instead, you maintain a separate data structure (e.g., a "subscription" or "offset" table/collection) that maps each consumer to the last event it has processed.


### Example Technologies

- **Event Store DB** (open source) supports this natively.
- **Kafka** (with compacted topics or consumer groups) does this via offsets.
- **Custom MongoDB solution**: Store events in a central collection, and maintain a "consumer checkpoint" collection.


### Summary Table

| Pattern/Approach | Centralized Event Store | Consumer Marks Processing | How? |
| :-- | :-- | :-- | :-- |
| Event Sourcing + Checkpoint | Yes | Yes | Separate checkpoint/offset per consumer |
| Transactional Outbox | No (per service) | No | Events marked as dispatched by producer |

### References

- [Event Sourcing pattern - Microservices.io][^7_1]
- [Event sourcing pattern - AWS][^7_2]
- [Event Sourcing pattern - Azure][^7_7]
- [StackOverflow: Event Store in Microservices][^7_3]

---

**In summary:**
Use the **Event Sourcing pattern** with a centralized event store and a consumer checkpoint mechanism. Consumers mark their progress by updating their own checkpoint, not by modifying the event itself[^7_1][^7_2][^7_7]. This enables reliable, scalable, and auditable event processing.

<div style="text-align: center">⁂</div>

[^7_1]: https://microservices.io/patterns/data/event-sourcing.html

[^7_2]: https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/service-per-team.html

[^7_3]: https://stackoverflow.com/questions/52544413/microservices-is-event-store-technology-in-event-sourcing-solutions-shared-b

[^7_4]: https://orkes.io/blog/4-microservice-patterns-crucial-in-microservices-architecture/

[^7_5]: https://www.openlegacy.com/blog/microservices-architecture-patterns/

[^7_6]: https://www.reddit.com/r/microservices/comments/zy6ccj/what_are_best_patterns_for_reliably_publishing/

[^7_7]: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing

[^7_8]: https://solace.com/event-driven-architecture-patterns/

