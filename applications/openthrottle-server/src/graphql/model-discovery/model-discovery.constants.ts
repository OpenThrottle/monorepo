import type { CacheHint } from '@openthrottle/nestjs-graphql';

/**
 * Cache hint for `discoverLocalModels` and its object-typed children. The
 * 60s window matches the model-discovery service's soft TTL, so the response
 * cache never serves a snapshot older than the service itself would. PRIVATE
 * because the response cache keys on the caller (permission-gated query).
 */
export const MODEL_DISCOVERY_CACHE_HINT: CacheHint = {
  maxAge: 60,
  scope: 'PRIVATE',
};
