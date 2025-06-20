import { Module } from '@nestjs/common';
import { SlackNotificationService } from './infrastructure/slack-notification.service';

@Module({
  providers: [SlackNotificationService],
  exports: [SlackNotificationService],
})
export class NotificationsModule {}
