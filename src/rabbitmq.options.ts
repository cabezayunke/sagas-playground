import { Transport, RmqOptions } from '@nestjs/microservices';

export const rabbitMQOptions: RmqOptions = {
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672'],
    queue: 'main_queue',
    prefetchCount: 1,
    queueOptions: {
      durable: true,
      // deadLetterExchange: 'dlx_exchange',
      // deadLetterRoutingKey: 'dead_letter_queue',
    },
    socketOptions: {
      heartbeatIntervalInSeconds: 60,
      reconnectTimeInSeconds: 5,
    },

  },
};

