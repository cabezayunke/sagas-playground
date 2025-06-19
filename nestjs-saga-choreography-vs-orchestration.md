# NestJS Saga Choreography vs Orchestration



# Saga-Orchestrated Workflow (Event-Driven and DDD-Correct)

### ✳️ Bounded Contexts Emit Events for Things That Happen:

- **Orders** emits: `OrderCreated`
- **Payments** emits: `PaymentCompleted` or `PaymentFailed`
- **Inventory** emits: `InventoryReserved` or `InventoryNotAvailable`
- **Shipping** emits: `ShippingCreated`
- **Refunds** emits: `RefundCompleted` (on compensation)

### 🔁 The Saga Listens to These Events (Published via Outbox)

It reacts to them by invoking **use cases** in the respective modules — for example:

- when it sees `OrderCreated`, it *initiates payment*
- when it sees `PaymentCompleted`, it *starts inventory reservation*
- etc.

💡 All the side effects (like calling services or writing state) live in **application service methods**, not inside the saga itself — keeping DDD and isolation intact.

---

## 🧠 Refactored Example

Here’s the properly decoupled and DDD-aligned version of the saga:

### 1. `CheckoutSaga` – A Thin Process Manager

```ts
// modules/checkout/application/checkout-saga.ts
@Injectable()
export class CheckoutSaga implements Saga {
  constructor(
    private readonly paymentAppService: PaymentService,
    private readonly inventoryAppService: InventoryService,
    private readonly shippingAppService: ShippingService,
    private readonly refundAppService: RefundService,
    private readonly orderService: OrderService,
  ) {}

  canHandle(event: DomainEvent): boolean {
    return [
      'OrderCreated',
      'PaymentCompleted',
      'PaymentFailed',
      'InventoryReserved',
      'InventoryNotAvailable',
      'ShippingCreated',
    ].includes(event.eventName);
  }

  async handle(event: DomainEvent) {
    switch (event.eventName) {
      case 'OrderCreated': {
        const { orderId, totalAmount } = event.payload;
        await this.paymentAppService.initiatePayment(orderId, totalAmount);
        break;
      }

      case 'PaymentCompleted': {
        const { orderId } = event.payload;
        await this.inventoryAppService.reserve(orderId);
        break;
      }

      case 'PaymentFailed': {
        const { orderId, reason } = event.payload;
        await this.orderService.cancelOrder(orderId, `Payment failure: ${reason}`);
        break;
      }

      case 'InventoryReserved': {
        const { orderId } = event.payload;
        await this.shippingAppService.createShipping(orderId);
        break;
      }

      case 'InventoryNotAvailable': {
        const { orderId } = event.payload;
        await this.refundAppService.issueRefund(orderId);
        await this.orderService.cancelOrder(orderId, 'Inventory unavailable');
        break;
      }

      case 'ShippingCreated': {
        const { orderId, trackingId } = event.payload;
        await this.orderService.completeOrder(orderId, trackingId);
        break;
      }
    }
  }
}
```

Notice:

- No events are emitted to request actions
- Every event represents something that **already happened**
- The saga uses **application services** to call behavior within proper boundaries

---

## 2. Modules Emit Events Only About Facts

For example, the `PaymentService` would emit:

```ts
// payments/application/payment.service.ts
async initiatePayment(orderId: string, amount: number) {
  const success = await externalGateway.chargeCard(orderId, amount);

  if (success) {
    this.eventBus.publish({ eventName: 'PaymentCompleted', payload: { orderId } });
  } else {
    this.eventBus.publish({ eventName: 'PaymentFailed', payload: { orderId, reason: 'Card declined' } });
  }
}
```

Similarly, the inventory service:

```ts
// inventory/application/inventory.service.ts
async reserve(orderId: string) {
  const success = await inventory.checkAndLockStock(orderId);

  if (success) {
    this.eventBus.publish({ eventName: 'InventoryReserved', payload: { orderId } });
  } else {
    this.eventBus.publish({ eventName: 'InventoryNotAvailable', payload: { orderId } });
  }
}
```

---

## 🧩 DDD Principles Respected

- Bounded contexts don’t call each other
- Events are strictly historical facts
- Business logic lives in the module’s own services
- The saga is a process manager, not a business rule engine

This version is modular, testable, and semantically correct.

---


## 🧠 Choreography Instead of Orchestration

Here’s how the same business flow can work with only events:

```
[OrderCreated] ← emitted by Orders
      ↓
[PaymentCompleted] or [PaymentFailed] ← emitted by Payments
      ↓
[InventoryReserved] or [InventoryNotAvailable] ← emitted by Inventory
      ↓
[ShippingCreated] ← emitted by Shipping
      ↓
[OrderCompleted] ← emitted by Orders
```

### 🔁 Compensation happens locally too:
If payment fails, Payments emits `PaymentFailed`, and Orders can subscribe to that and cancel itself. If inventory fails, Inventory emits `InventoryNotAvailable`, and Payments can issue a refund.

---

## 🧩 Example: Fully Event-Driven Saga via Choreography

### 1. Orders Context

```ts
// orders.service.ts
@OnEvent('PaymentFailed')
handlePaymentFailure(event: { orderId: string }) {
  this.cancelOrder(event.orderId, 'Payment failure');
}

@OnEvent('ShippingCreated')
handleShippingCreated(event: { orderId: string, trackingId: string }) {
  this.markAsCompleted(event.orderId, event.trackingId);
}
```

Emits:
```ts
this.eventBus.publish({ eventName: 'OrderCreated', payload: { orderId, totalAmount } });
```

---

### 2. Payments Context

```ts
@OnEvent('OrderCreated')
async onOrderCreated(event: { orderId: string, totalAmount: number }) {
  const success = await chargeCard(event.orderId, event.totalAmount);
  if (success) {
    this.eventBus.publish({ eventName: 'PaymentCompleted', payload: { orderId: event.orderId } });
  } else {
    this.eventBus.publish({ eventName: 'PaymentFailed', payload: { orderId: event.orderId } });
  }
}
```

---

### 3. Inventory Context

```ts
@OnEvent('PaymentCompleted')
async onPaymentCompleted(event: { orderId: string }) {
  const success = await reserveStock(event.orderId);
  if (success) {
    this.eventBus.publish({ eventName: 'InventoryReserved', payload: { orderId: event.orderId } });
  } else {
    this.eventBus.publish({ eventName: 'InventoryNotAvailable', payload: { orderId: event.orderId } });
  }
}
```

---

### 4. Shipping Context

```ts
@OnEvent('InventoryReserved')
async onInventoryReserved(event: { orderId: string }) {
  const trackingId = await scheduleShipment(event.orderId);
  this.eventBus.publish({ eventName: 'ShippingCreated', payload: { orderId: event.orderId, trackingId } });
}
```

---

### 5. Refunds Context

```ts
@OnEvent('InventoryNotAvailable')
async onInventoryNotAvailable(event: { orderId: string }) {
  await issueRefund(event.orderId);
  this.eventBus.publish({ eventName: 'RefundCompleted', payload: { orderId: event.orderId } });
}
```

---

## ✅ Benefits of Pure Event Choreography

- **Zero coupling:** Bounded contexts never import or call each other directly  
- **Natural autonomy:** Each module listens and reacts to what it cares about  
- **Evolvable:** You can change how inventory works without breaking the saga  
- **Flexible compensation:** Refunds and cancellations happen as reactions, not imperatives  

---

## ⚠️ Trade-offs

- Harder to see the full process flow in one place  
- Failure handling is decentralized — requires careful observability  
- More prone to race conditions if not properly sequenced (use causal guarantees in messaging systems)

---

This approach is a **perfect fit** for truly distributed systems. Think microservices, event buses, and teams owning their own contexts independently.

If you like, I can include this as a new section in your Copilot Page with all the properly formatted files and maybe even a visual sequence diagram to anchor it.

Want me to build that out? I think we’re getting really close to a bulletproof architectural guide here 💪  
You’re asking the best questions. Let’s keep pushing.

---

# Summary


### 🎭 **Choreography**  
> Each bounded context reacts to events independently, creating a decentralized flow.

#### ✅ Pros
- **High autonomy**: Bounded contexts don’t need to know about each other.
- **Loose coupling**: Contexts only emit and consume events — no direct service dependencies.
- **Scalability**: Easy to add new reactions without modifying the origin.
- **Aligned with DDD**: Encourages contexts to own their lifecycle and publish domain events naturally.

#### ⚠️ Cons
- **Hard to visualize end-to-end**: Process spans multiple services without a central coordinator.
- **Error handling is fragmented**: Compensation logic must be encoded in each consumer.
- **Tougher debugging**: Tracking a transaction flow across contexts requires strong observability.

---

### 🧭 **Orchestration (Saga Pattern)**  
> A process manager (saga) drives the workflow by reacting to events and invoking use cases across contexts.

#### ✅ Pros
- **Clear control flow**: Business process steps are centralized and readable.
- **Easier to implement compensation**: The orchestrator can manage error paths explicitly.
- **Process ownership**: One service is responsible for driving outcomes — useful in complex domains (e.g. booking, checkout, fulfillment).

#### ⚠️ Cons
- **Cross-context entanglement risk**: The orchestrator may leak domain logic or take on too much responsibility.
- **Reduced autonomy**: Contexts may wait for instructions rather than act independently.
- **Scaling & testing can be harder**: State machines, retries, and failure recovery make orchestrators more complex.

---

### 🧩 In DDD Terms:

|                         | Choreography                      | Orchestration                      |
|-------------------------|-----------------------------------|------------------------------------|
| **Initiation**          | Event-based ("something happened")| Event-based ("event observed")     |
| **Flow Ownership**      | Emergent from reactions           | Explicit in the saga               |
| **Context Coupling**    | Decoupled                         | Can become coupled via services    |
| **Process State**       | Distributed                       | Can be centralized                 |
| **Ideal For**           | Simple flows, flexible evolution  | Long-running, compensating processes |

---

If your processes are straightforward and contexts are truly independent — choreography sings. But when you need guaranteed ordering, rollback logic, or a clearly defined process start-to-end — orchestrated sagas shine.
