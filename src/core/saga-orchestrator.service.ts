import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEvent } from './events/events';
import { EventBusService } from '../common/event-bus.service';
import { Saga } from './saga.interface';

@Injectable()
export class SagaOrchestrator implements OnModuleInit {
  private sagas: Saga[] = [];

  constructor(private readonly eventBus: EventBusService) { }

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