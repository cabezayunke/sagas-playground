import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { rabbitMQOptions } from './rabbitmq.options';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice(rabbitMQOptions);
  await app.startAllMicroservices();
  await app.listen(3000);
}
bootstrap();