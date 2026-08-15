/**
 * @description Re-export of the canonical `isRecord` type guard, now owned by
 * `@openthrottle/nodejs-utils`. Kept as a thin wrapper so existing
 * `@openthrottle/nestjs-testing` test imports keep compiling.
 *
 * @public
 */
export { isRecord } from '@openthrottle/nodejs-utils';
