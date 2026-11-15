import { Module } from '@nestjs/common';

import { DevelopmentGraphqlModule } from '../../graphql/development/development.module.ts';

/**
 * Development module for testing flows (e.g. websocket notifications) from the web app.
 * Owns the development GraphQL service (resolver + service) for triggering test flows.
 *
 * Loaded only when `isDevelopmentGraphqlEnabled` (development.utils.ts) allows it: off
 * when NODE_ENV=production unless OT_ENABLE_DEV_GRAPHQL=true. See openthrottle-server.utils.ts.
 */
@Module({
  controllers: [],
  imports: [DevelopmentGraphqlModule],
})
export class DevelopmentModule {}
