import type { ServerHealthStatus } from './server-health.object.ts';

export interface ServerHealthResponse {
  readonly api: string;
  readonly cms: ServerHealthStatus;
  readonly database: ServerHealthStatus;
  readonly redis: ServerHealthStatus;
  readonly websocket: ServerHealthStatus;
}
