export { NestjsThrottlerError } from './config/nestjs-throttler.error';
export {
  applyNestjsThrottlerModuleDefaults,
  DEFAULT_THROTTLER_LIMIT,
  DEFAULT_THROTTLER_TTL_MS,
  NESTJS_THROTTLER_MODULE_OPTIONS,
  type NestjsThrottlerModuleAsyncOptions,
  type NestjsThrottlerModuleOptions,
  parseNestjsThrottlerModuleOptions,
  type ResolvedNestjsThrottlerModuleOptions,
  type ThrottlerTierOptions,
  validateNestjsThrottlerModuleOptions,
} from './config/nestjs-throttler.options';
export { NestjsThrottlerModule } from './modules/nestjs-throttler.module';
