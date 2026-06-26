/**
 * Local LLM model discovery — pure, framework-agnostic core.
 *
 * Detects *running* OpenAI-compatible model servers on the local machine and
 * lists the models they serve. Native `fetch`, no new deps, no `process.env`
 * reads (callers pass an env-like object to {@link resolveHosts} /
 * {@link resolvePorts}).
 */
export * from './constants.ts';
export * from './discover.ts';
export * from './hosts.ts';
export * from './probe.ts';
