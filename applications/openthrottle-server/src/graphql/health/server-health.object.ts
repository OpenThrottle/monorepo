/**
 * @description GraphQL object type for server health (API, Cortex DB, Redis). Used by health / serverHealth query.
 */

import { Field, ObjectType } from '@nestjs/graphql';

/** Status string for a single check: ok | unconfigured | unreachable. */
export type ServerHealthStatus = 'ok' | 'unconfigured' | 'unreachable';

@ObjectType({
  description: `Server health: API reachability, OpenThrottle DB, Redis (BullMQ), and WebSocket. Each component is ok, unconfigured, or unreachable.`,
})
export class ServerHealthObject {
  @Field(() => String, {
    description: `API status. "ok" when the resolver runs.`,
  })
  api!: string;

  @Field(() => String, {
    description: `OpenThrottle DB status: ok | unconfigured | unreachable. Reuses existing databaseHealth logic.`,
  })
  database!: string;

  @Field(() => String, {
    description: `Redis (BullMQ) status: ok | unconfigured | unreachable. From Redis PING.`,
  })
  redis!: string;

  @Field(() => String, {
    description: `WebSocket (Socket.IO) status: ok when server process is running.`,
  })
  websocket!: string;
}
