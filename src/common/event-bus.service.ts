import { Injectable } from '@nestjs/common';
import { DomainEvent } from '../core/events/events';

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