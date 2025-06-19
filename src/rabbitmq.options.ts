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