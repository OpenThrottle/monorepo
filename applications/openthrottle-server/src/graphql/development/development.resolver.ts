/**
 * @description GraphQL resolver for development/testing flows (e.g. websocket notification).
 * Enables the web app to trigger test flows via button click.
 */

import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { DevelopmentService } from './development.service';

@Resolver()
export class DevelopmentResolver {
  constructor(private readonly developmentService: DevelopmentService) {}

  /**
   * @description Ping the development API. Returns "pong" when reachable.
   */
  @Query(() => String, {
    description: `Development ping. Returns "pong" when the development GraphQL API is reachable.`,
  })
  developmentPing(): string {
    return this.developmentService.ping();
  }

  /**
   * @description Triggers the websocket notification flow. Emits a test system.alert over the
   * socket so the web app can verify the notification is received end-to-end.
   */
  @Mutation(() => Boolean, {
    description: `Trigger a test websocket notification (system.alert). Returns true when the event was emitted. Use from the web app to verify the notification flow end-to-end.`,
  })
  triggerWebsocketNotification(): boolean {
    this.developmentService.triggerWebsocketNotification();
    return true;
  }
}
