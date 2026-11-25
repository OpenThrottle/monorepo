/**
 * Shared defaults for local model discovery. Kept in one place so the host
 * resolver, prober, and the top-level {@link discoverModels} agree.
 */

/** Default host probed when no override is supplied. */
export const DEFAULT_HOST = `localhost`;

/**
 * Docker bridge alias. A Dockerized server reaches a host-side Ollama/LM Studio
 * through this name, so it is always merged into the host set.
 */
export const DOCKER_INTERNAL_HOST = `host.docker.internal`;

/** Deterministic host preference used when de-duplicating endpoints. */
export const HOST_PREFERENCE: readonly string[] = [
  `localhost`,
  `127.0.0.1`,
  DOCKER_INTERNAL_HOST,
];

/**
 * Default ports probed: the common OpenAI-compatible server range (`8000-8020`),
 * LM Studio (`1234`), and Ollama (`11434`/`11435`).
 */
export const DEFAULT_PORTS: readonly number[] = [
  ...Array.from({ length: 21 }, (_unused, index) => 8000 + index),
  1234,
  11434,
  11435,
];

/** Env var holding an explicit `host[:port]` list (comma/space separated). */
export const LLM_HOSTS_ENV = `LLM_HOSTS`;

/** Env var holding an explicit port list (comma/space separated). */
export const LLM_PORTS_ENV = `LLM_PORTS`;

/** Provider base-URL env vars whose host+port are merged into the scan set. */
export const PROVIDER_URL_ENVS: readonly string[] = [
  `OLLAMA_BASE_URL`,
  `OLLAMA_URL`,
  `LM_STUDIO_URL`,
];

/** Default max in-flight probes. */
export const DEFAULT_MAX_CONCURRENCY = 50;

/** Default `/v1/models` probe timeout, in milliseconds. */
export const DEFAULT_PROBE_TIMEOUT_MS = 3000;

/** Default provider-fingerprint probe timeout, in milliseconds. */
export const DEFAULT_FINGERPRINT_TIMEOUT_MS = 1500;
