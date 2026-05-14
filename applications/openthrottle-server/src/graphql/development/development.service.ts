/**
 * @description Service for development/testing flows (e.g. websocket notification).
 * Used by the development GraphQL API so the web app can trigger test flows on button click.
 */

import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import type { LogJsonlSink } from '@openthrottle/nestjs-logging';
import { LOG_JSONL_SINK } from '@openthrottle/nestjs-logging';
import { isOpenthrottleServerDevJsonlLoggingEnabled } from '../../config/openthrottle-server-dev-jsonl-logging';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class DevelopmentService {
  constructor(
    private readonly notifications: NotificationsService,
    @Optional()
    @Inject(LOG_JSONL_SINK)
    private readonly logJsonlSink: LogJsonlSink | undefined,
  ) {}

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

    this.logJsonlSink?.append({
      context: '🤖 - ONE',
      correlationId: undefined,
      extra: {
        array: [1, 2, 3],
        boolean: true,
        message: `Some data in an object`,
      },
      level: 'debug',
      message: `Development JSONL sample — append from GraphQL (nestjs-logging integration smoke test).`,
      timestampIso: new Date().toISOString(),
      traceId: undefined,
    });

    this.logJsonlSink?.append({
      context: '🤖 - ANOTHER',
      correlationId: undefined,
      level: 'debug',
      message: `Another Message here, a warn...`,
      timestampIso: new Date().toISOString(),
      traceId: undefined,
    });
  }

  /**
   * @description Appends one structured JSONL line and fans out to the logging WebSocket hub when
   * `OT_SERVER_DEV_JSONL_LOGGING=true` and the server was restarted with that flag.
   */
  async triggerDevJsonlLogSample(): Promise<boolean> {
    if (!isOpenthrottleServerDevJsonlLoggingEnabled()) {
      throw new BadRequestException(
        'Dev JSONL logging is disabled. Set OT_SERVER_DEV_JSONL_LOGGING=true and restart the server.',
      );
    }

    if (this.logJsonlSink === undefined) {
      throw new BadRequestException(
        'JSONL sink is not registered. Ensure OT_SERVER_DEV_JSONL_LOGGING was true at process start.',
      );
    }

    this.logJsonlSink.append({
      context: 'DevelopmentGraphql',
      correlationId: undefined,
      level: 'log',
      message: `Development JSONL sample — append from GraphQL (nestjs-logging integration smoke test).`,
      timestampIso: new Date().toISOString(),
      traceId: undefined,
    });
    await Promise.resolve(this.logJsonlSink.flush());

    return true;
  }
}
