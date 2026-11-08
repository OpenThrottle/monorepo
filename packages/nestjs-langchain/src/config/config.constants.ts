/**
 * ------------------------------------------------------------
 * @description Shared resilience / cost-control defaults applied to every
 * LangChain provider constructed in this package (chat models, embedding
 * models, and the embeddings used by vector stores).
 *
 * LangChain providers extend `AsyncCallerParams`, which exposes:
 *   - `maxRetries`     — retries per call with exponential backoff.
 *   - `maxConcurrency` — ceiling on simultaneous in-flight requests.
 *
 * Both default to permissive values upstream (`maxRetries: 6`,
 * `maxConcurrency: Infinity`). Left unbounded, a hung or rate-limited
 * VertexAI / Ollama call can retry repeatedly and fan out without limit,
 * compounding latency and token/cost spend. We tighten these defaults while
 * still letting callers override them per request.
 *
 * @external https://js.langchain.com/docs/integrations/chat/
 * ------------------------------------------------------------
 */

/**
 * Default ceiling on concurrent in-flight provider requests. Bounds fan-out
 * so a batch (e.g. embedding many documents) cannot saturate the provider or
 * exhaust quota in a single burst.
 *
 * @public
 */
export const DEFAULT_MAX_CONCURRENCY = 5;

/**
 * Default number of retries per provider call. Lower than LangChain's default
 * of 6 so a hung or repeatedly-failing call fails fast instead of multiplying
 * latency and token/cost spend through prolonged exponential backoff.
 *
 * @public
 */
export const DEFAULT_MAX_RETRIES = 2;
