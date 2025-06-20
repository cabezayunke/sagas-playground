export interface DomainEvent {
  eventName: string;
  payload: any;
}

export class OrderCreatedEvent implements DomainEvent {
  eventName = 'OrderCreated';
  constructor(public payload: { orderId: string; items: any[] }) { }
}

export class OrderConfirmedEvent implements DomainEvent {
  eventName = 'OrderConfirmed';
  constructor(public payload: { orderId: string }) { }
}

export class OrderCancelledEvent implements DomainEvent {
  eventName = 'OrderCancelled';
  constructor(public payload: { orderId: string; reason?: string }) { }
}

export class InventoryReservedEvent implements DomainEvent {
  eventName = 'InventoryReserved';
  constructor(public payload: { orderId: string }) { }
}

export class InventoryReservationFailedEvent implements DomainEvent {
  eventName = 'InventoryReservationFailed';
  constructor(public payload: { orderId: string; reason: string }) { }
}
