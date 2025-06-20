import { Injectable } from '@nestjs/common';
import { DomainEvent } from './events/events';
import { EventEmitter2 } from '@nestjs/event-emitter';

type EventHandler = (event: DomainEvent) => void;

@Injectable()
export class EventBusService {
  private handlers: Record<string, EventHandler[]> = {};
  private globalHandlers: EventHandler[] = [];

  constructor(private eventEmitter: EventEmitter2) { }

  publish(event: DomainEvent) {
    (this.handlers[event.eventName] || []).forEach(handler => handler(event));
    this.globalHandlers.forEach(handler => handler(event));
    this.eventEmitter.emit(event.eventName, event);
  }

  subscribe(eventName: string, handler: EventHandler) {
    this.handlers[eventName] = this.handlers[eventName] || [];
    this.handlers[eventName].push(handler);
  }

  subscribeAll(handler: EventHandler) {
    this.globalHandlers.push(handler);
  }
}