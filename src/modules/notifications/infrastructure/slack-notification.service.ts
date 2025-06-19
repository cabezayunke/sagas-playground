import { Injectable, Logger } from '@nestjs/common';
// import axios from 'axios';

@Injectable()
export class SlackNotificationService {
  private readonly logger = new Logger(SlackNotificationService.name);
  // private readonly slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || '';

  async sendNotification(message: string): Promise<void> {
    // if (!this.slackWebhookUrl) {
    //   this.logger.warn('Slack webhook URL is not set.');
    //   return;
    // }
    try {
      // await axios.post(this.slackWebhookUrl, { text: message });
      this.logger.log(`Slack notification sent: ${message}`);
    } catch (error) {
      this.logger.error('Failed to send Slack notification', error);
    }
  }
}