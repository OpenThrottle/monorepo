/**
 * @description WebSocket gateway scaffolding for NestJS applications using Socket.IO.
 * Import NestjsWebsocketsModule and use this gateway for real-time events.
 */

import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class NestjsWebsocketsGateway {
  @WebSocketServer()
  server!: Server;

  /**
   * @description Handles incoming 'events' messages from clients. Extend or add more handlers as needed.
   */
  @SubscribeMessage('events')
  handleEvents(@MessageBody() data: unknown): unknown {
    return { data, event: 'events' };
  }
}
