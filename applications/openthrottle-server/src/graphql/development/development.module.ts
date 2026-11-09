/**
 * @description GraphQL module for development/testing flows (e.g. websocket notification).
 * Exposes queries and mutations so the web app can trigger test flows on button click.
 *
 * NOTE: Guards to restrict access (e.g. NODE_ENV checks, role-based access) are not implemented
 * yet and are out of scope for now. Restricting this module to non-production or authorized
 * users is a future concern.
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
