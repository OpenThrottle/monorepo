/**
 * Remote LLM model catalogs — pure, framework-agnostic core.
 *
 * The remote sibling of `../model-discovery/`: instead of port-scanning
 * `localhost` for OpenAI-compatible servers, this reads a hosted gateway's
 * published catalog. Native `fetch` (injectable), no new deps, no `process.env`
 * reads — callers pass `baseUrl`/`apiKey` explicitly.
 */
export * from './constants.ts';
export * from './openrouter.ts';
