/**
 * @description ioredis connection options every BullMQ queue in this checkout
 * connects with. Shared by the module's root config and by queues built outside
 * DI (e.g. dynamic queues) so neither can drift from the other — a queue that
 * drops `password`/`username`/`tls`/`db` cannot authenticate, or lands in the
 * wrong database.
 *
 * @public
 */
export interface RedisConnectionOptions {
  readonly db: number | undefined;
  readonly enableReadyCheck: boolean;
  readonly family: number | undefined;
  readonly host: string;
  readonly maxRetriesPerRequest: null;
  readonly password: string | undefined;
  readonly port: number;
  readonly tls: Record<string, never> | undefined;
  readonly username: string | undefined;
}
