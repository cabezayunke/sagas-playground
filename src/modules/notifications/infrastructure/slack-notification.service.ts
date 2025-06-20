import { Injectable } from '@nestjs/common';
// import axios from 'axios';

@Injectable()
export class SlackNotificationService {

  // private readonly slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || '';

  async sendNotification(message: string): Promise<void> {
    // if (!this.slackWebhookUrl) {
    //   return;
    // }
    try {
      // await axios.post(this.slackWebhookUrl, { text: message });
      console.log(`Slack notification sent: ${message}`);
    } catch (error) {
      console.error('Slack notification FAILED', error);
    }
  }
}