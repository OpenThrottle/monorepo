import { Module } from '@nestjs/common';
import { DevelopmentGraphqlModule } from '../../graphql/development/development-graphql.module';

/**
 * Development module for testing flows (e.g. websocket notifications) from the web app.
 * Owns the development GraphQL service (resolver + service) for triggering test flows.
 *
 * NOTE: Guards to restrict access (e.g. NODE_ENV checks, role-based access) are not implemented
 * yet and are out of scope for now. Restricting this module to non-production or authorized
 * users is a future concern.
 */
@Module({
  controllers: [],
  imports: [DevelopmentGraphqlModule],
})
export class DevelopmentModule {}
