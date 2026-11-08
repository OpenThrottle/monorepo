/**
 * Minimal logging surface accepted by {@link createRedisClient}. Matches the
 * shape of the injectable `LoggerService` from `@openthrottle/nestjs-modules`
 * as well as the built-in NestJS `Logger`, so connection-level errors are
 * routed to the application logger instead of surfacing as unhandled `error`
 * events (which can crash the Node process).
 */
export interface RedisClientLogger {
  error: (message: unknown, ...optionalParams: unknown[]) => void;
  warn: (message: unknown, ...optionalParams: unknown[]) => void;
}
