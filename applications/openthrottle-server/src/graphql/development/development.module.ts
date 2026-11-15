/**
 * @description GraphQL module for development/testing flows (e.g. websocket notification).
 * Exposes queries and mutations so the web app can trigger test flows on button click.
 *
 * Loaded only when `isDevelopmentGraphqlEnabled` (development.utils.ts) allows it: off
 * when NODE_ENV=production unless OT_ENABLE_DEV_GRAPHQL=true. See openthrottle-server.utils.ts.
 */

import { Module } from '@nestjs/common';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { DevelopmentResolver } from './development.resolver.ts';
import { DevelopmentService } from './development.service.ts';

@Module({
  imports: [NotificationsModule],
  providers: [DevelopmentResolver, DevelopmentService],
})
export class DevelopmentGraphqlModule {}
