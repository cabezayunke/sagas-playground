import { DomainEvent } from './events/events';

export interface Saga {
  canHandle(event: DomainEvent): boolean;
  handle(event: DomainEvent): Promise<void>;
}