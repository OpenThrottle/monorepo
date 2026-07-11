/**
 * Public types for local LLM model discovery.
 *
 * Discovery probes *running* OpenAI-compatible model servers on the local
 * machine (Ollama-primary; also vLLM, llama.cpp, SGLang, LM Studio) via
 * `GET /v1/models`. It does NOT scan model files on disk and does NOT
 * introspect which cloud models an agent CLI is configured to use.
 */

/**
 * Best-effort provider label for a discovered local model server.
 *
 * `null` when the server answers `/v1/models` but cannot be fingerprinted to a
 * known provider. We deliberately do NOT default unknown servers to `vllm`.
 *
 * @public
 */
export type ModelProvider = 'lmstudio' | 'ollama';

/**
 * A reachable local model server endpoint and the model ids it serves.
 *
 * @public
 */
export interface ModelEndpoint {
  /** The OpenAI-compatible `/v1` base URL, e.g. `http://localhost:11434/v1`. */
  readonly baseUrl: string;
  /** Host the endpoint was reached on, e.g. `localhost` or `host.docker.internal`. */
  readonly host: string;
  /** Sorted, de-duplicated model ids advertised by `/v1/models`. */
  readonly models: readonly string[];
  /** Port the endpoint was reached on. */
  readonly port: number;
  /** Best-effort provider label, or `null` when not fingerprinted. */
  readonly provider: ModelProvider | null;
}

/**
 * Result of a single local model discovery scan.
 *
 * @public
 */
export interface DiscoveryResult {
  /** De-duplicated endpoints, stably sorted by `(host, port)`. */
  readonly endpoints: readonly ModelEndpoint[];
  /** ISO-8601 timestamp; stamped by the caller, never by the pure core. */
  readonly scannedAt: string;
  /** Hosts that were probed during this scan, in resolution order. */
  readonly scannedHosts: readonly string[];
}

/**
 * Minimal env-like shape the core reads. The pure core never touches
 * `process.env` directly — callers pass this explicitly so it stays testable.
 *
 * @public
 */
export type DiscoveryEnv = Record<string, string | undefined>;

/**
 * Explicit options for {@link discoverModels}. No implicit env reads: resolve
 * hosts/ports up front with {@link resolveHosts} / {@link resolvePorts}.
 *
 * @public
 */
export interface DiscoverModelsOptions {
  /** Per-request timeout for the provider fingerprint probe. Default 1500ms. */
  readonly fingerprintTimeoutMs?: number;
  /** Hosts to probe, e.g. `['localhost', 'host.docker.internal']`. */
  readonly hosts: readonly string[];
  /** Max in-flight probes. Default 50. */
  readonly maxConcurrency?: number;
  /** Ports to probe on each host. */
  readonly ports: readonly number[];
  /** Per-request timeout for the `/v1/models` probe. Default 3000ms. */
  readonly probeTimeoutMs?: number;
  /**
   * ISO-8601 scan timestamp. The caller stamps this (e.g. the cached Nest
   * wrapper); when omitted, {@link discoverModels} defaults to the current time.
   */
  readonly scannedAt?: string;
}
