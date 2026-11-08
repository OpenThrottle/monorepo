import {
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_MAX_RETRIES,
} from './config.constants.ts';
import type { ResilienceConfig } from './config.types.ts';
/**
 * @description Resolves caller-supplied resilience options against the package
 * defaults, returning a fully-populated object safe to spread into a provider
 * constructor.
 *
 * @public
 */
export const resolveResilienceConfig = (
  config: ResilienceConfig = {},
): Required<ResilienceConfig> => {
  const {
    maxConcurrency = DEFAULT_MAX_CONCURRENCY,
    maxRetries = DEFAULT_MAX_RETRIES,
  } = config;

  return { maxConcurrency, maxRetries };
};
