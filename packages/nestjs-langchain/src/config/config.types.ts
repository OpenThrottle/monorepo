/**
 * @description Per-call resilience controls shared by every provider factory.
 * All fields are optional so callers can opt into the defaults or override
 * them as needed.
 *
 * @public
 */
export interface ResilienceConfig {
  /**
   * Maximum number of concurrent in-flight requests.
   * @default DEFAULT_MAX_CONCURRENCY
   */
  maxConcurrency?: number;
  /**
   * Maximum number of retries per call (exponential backoff between attempts).
   * @default DEFAULT_MAX_RETRIES
   */
  maxRetries?: number;
}
