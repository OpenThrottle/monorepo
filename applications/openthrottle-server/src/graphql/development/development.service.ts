/**
 * @description Service for development/testing flows (e.g. websocket notification).
 * Used by the development GraphQL API so the web app can trigger test flows on button click.
 */

import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class DevelopmentService {
  constructor(private readonly notifications: NotificationsService) {}

  /**
   * @description Simple ping for testing that the development GraphQL API is reachable.
   */
  ping(): string {
    return 'pong';
  }

  /**
   * @description Triggers the websocket notification flow by emitting a test system.alert
   * so the client can verify the notification is received over the socket.
   */
  triggerWebsocketNotification(): void {
    this.notifications.emitSystemAlert({
      code: 'DEV_TEST',
      message: `Development test notification — websocket flow triggered from GraphQL`,
      severity: 'info',
    });
  }
}
