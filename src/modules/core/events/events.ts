import { v4 as uuidv4 } from 'uuid';

export abstract class DomainEvent {
  id: string;

  constructor(public eventName: string, public payload: any, public retries: number = 0) {
    this.id = uuidv4()
  }
}

export class OrderCreatedEvent extends DomainEvent {
  static name = 'OrderCreated';
  constructor(public payload: { orderId: string; items: any[] }, retries: number = 0) {
    super(OrderCreatedEvent.name, payload, retries)
  }
}

export class OrderConfirmedEvent extends DomainEvent {
  static name = 'OrderConfirmed';
  constructor(public payload: { orderId: string }, retries: number = 0) {
    super(OrderConfirmedEvent.name, payload, retries)
  }
}

export class OrderCancelledEvent extends DomainEvent {
  static name = 'OrderCancelled';
  constructor(public payload: { orderId: string; reason?: string }, retries: number = 0) {
    super(OrderCancelledEvent.name, payload, retries)
  }
}

export class InventoryReservedEvent extends DomainEvent {
  static name = 'InventoryReserved';
  constructor(public payload: { orderId: string }, retries: number = 0) {
    super(InventoryReservedEvent.name, payload, retries)
  }
}

export class InventoryReservationFailedEvent extends DomainEvent {
  static name = 'InventoryReservationFailed';
  constructor(public payload: { orderId: string; reason: string }, retries: number = 0) {
    super(InventoryReservationFailedEvent.name, payload, retries)
  }
}
