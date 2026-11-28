import { isRecord } from '@openthrottle/nodejs-utils';

import {
  DEFAULT_FINGERPRINT_TIMEOUT_MS,
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_PROBE_TIMEOUT_MS,
} from '../config/model-discovery.ts';
import type { ModelEndpoint, ModelProvider } from '../types/model-discovery.ts';

/** Per-probe timeout knobs. */
export interface ProbeOptions {
  /** Provider-fingerprint timeout, ms. Default {@link DEFAULT_FINGERPRINT_TIMEOUT_MS}. */
  readonly fingerprintTimeoutMs?: number;
  /** `/v1/models` probe timeout, ms. Default {@link DEFAULT_PROBE_TIMEOUT_MS}. */
  readonly probeTimeoutMs?: number;
}

/** Options for {@link probeAll}. */
export interface ProbeAllOptions extends ProbeOptions {
  /** Max in-flight probes. Default {@link DEFAULT_MAX_CONCURRENCY}. */
  readonly maxConcurrency?: number;
}

/** A unit of async work the limiter runs. */
export type LimitedTask<T> = () => Promise<T>;

/** A p-limit-style runner that caps concurrent tasks. */
export type LimitFunction = <T>(task: LimitedTask<T>) => Promise<T>;

/**
 * GET a URL and parse JSON, bounded by an AbortController timeout. Returns the
 * parsed body, or `null` on any non-2xx / network / timeout / parse failure —
 * so a dead host can never stall the sweep.
 */
async function fetchJson(
  url: string,
  timeoutMs: number,
  body?: unknown,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: `application/json`,
        ...(body === undefined ? {} : { 'content-type': `application/json` }),
      },
      ...(body === undefined
        ? {}
        : { body: JSON.stringify(body), method: `POST` }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract sorted, de-duplicated model ids from an OpenAI-compatible
 * `/v1/models` body (`{ data: [{ id }] }`). Returns `null` when the body is not
 * shaped like a model list (i.e. not a model-serving endpoint). An empty
 * `data[]` is a valid — if idle — endpoint and yields `[]`.
 */
function extractModelIds(payload: unknown): string[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return null;
  }

  const ids = new Set<string>();
  for (const item of payload.data) {
    if (isRecord(item) && typeof item.id === `string` && item.id.length > 0) {
      ids.add(item.id);
    }
  }

  return [...ids].sort();
}

/** LM Studio's `/api/v1/models` items carry `key` + `architecture` metadata. */
function isLmStudioShape(payload: unknown): boolean {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return false;
  }

  return payload.data.some(
    (item) => isRecord(item) && (`architecture` in item || `key` in item),
  );
}

/**
 * Best-effort provider fingerprint for an already-reachable server `origin`
 * (e.g. `http://localhost:11434`). Probes Ollama's `/api/tags` and LM Studio's
 * `/api/v1/models`; returns `null` (treat as generic OpenAI-compatible) when
 * neither matches. Never throws.
 */
export async function fingerprintProvider(
  origin: string,
  options: ProbeOptions = {},
): Promise<ModelProvider | null> {
  const timeoutMs =
    options.fingerprintTimeoutMs ?? DEFAULT_FINGERPRINT_TIMEOUT_MS;

  const ollama = await fetchJson(`${origin}/api/tags`, timeoutMs);
  if (isRecord(ollama) && Array.isArray(ollama.models)) {
    return `ollama`;
  }

  const lmstudio = await fetchJson(`${origin}/api/v1/models`, timeoutMs);
  if (isLmStudioShape(lmstudio)) {
    return `lmstudio`;
  }

  return null;
}

/** Ollama's `/api/show` lists `capabilities` (e.g. `completion`, `vision`). */
async function ollamaAcceptsImages(
  origin: string,
  model: string,
  timeoutMs: number,
): Promise<boolean> {
  const show = await fetchJson(`${origin}/api/show`, timeoutMs, { model });
  return (
    isRecord(show) &&
    Array.isArray(show.capabilities) &&
    show.capabilities.includes(`vision`)
  );
}

/**
 * LM Studio model ids that accept images, from `/api/v1/models`: an item is
 * vision-capable when it reports `capabilities.vision === true` or the legacy
 * `type: 'vlm'`. Items are matched by `key` (falling back to `id`).
 */
function lmStudioVisionIds(payload: unknown): Set<string> {
  const ids = new Set<string>();
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return ids;
  }

  for (const item of payload.data) {
    if (!isRecord(item)) {
      continue;
    }
    const hasVision =
      item.type === `vlm` ||
      (isRecord(item.capabilities) && item.capabilities.vision === true);
    const id = typeof item.key === `string` ? item.key : item.id;
    if (hasVision && typeof id === `string`) {
      ids.add(id);
    }
  }

  return ids;
}

/**
 * Which of an endpoint's `models` accept image input, best-effort per provider
 * (Ollama `/api/show` capabilities; LM Studio model metadata). Any other server
 * (vLLM, llama.cpp, SGLang) advertises no modality over `/v1/models`, so its
 * models default to NOT vision-capable. Sorted; never throws.
 */
export async function detectVisionModels(
  origin: string,
  provider: ModelProvider | null,
  models: readonly string[],
  timeoutMs: number = DEFAULT_FINGERPRINT_TIMEOUT_MS,
): Promise<string[]> {
  if (provider === `ollama`) {
    const flags = await Promise.all(
      models.map((model) => ollamaAcceptsImages(origin, model, timeoutMs)),
    );
    return models.filter((_model, index) => flags[index] === true);
  }

  if (provider === `lmstudio`) {
    const ids = lmStudioVisionIds(
      await fetchJson(`${origin}/api/v1/models`, timeoutMs),
    );
    return models.filter((model) => ids.has(model));
  }

  return [];
}

/**
 * Probe a single `host:port` for an OpenAI-compatible `/v1/models` endpoint.
 * Returns a {@link ModelEndpoint} when the server answers with a model list, or
 * `null` when it is unreachable / not model-serving. Never throws.
 */
export async function probeEndpoint(
  host: string,
  port: number,
  options: ProbeOptions = {},
): Promise<ModelEndpoint | null> {
  const probeTimeoutMs = options.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  const origin = `http://${host}:${port}`;

  const payload = await fetchJson(`${origin}/v1/models`, probeTimeoutMs);
  const models = extractModelIds(payload);
  if (models === null) {
    return null;
  }

  const provider = await fingerprintProvider(origin, {
    fingerprintTimeoutMs: options.fingerprintTimeoutMs,
  });

  const visionModels = await detectVisionModels(
    origin,
    provider,
    models,
    options.fingerprintTimeoutMs,
  );

  return {
    baseUrl: `${origin}/v1`,
    host,
    models,
    port,
    provider,
    visionModels,
  };
}

/**
 * Create a p-limit-style limiter capping concurrent tasks to `concurrency`.
 * Promise-based — NOT one thread per target.
 *
 * Accounting note: `run` increments `active` and `drain` decrements it, kept
 * balanced because every code path through `run` reaches its `finally` (the
 * task's rejection is caught and routed to `reject`, not rethrown). The queued
 * wrapper `() => void run()` deliberately discards the inner promise — `run`
 * itself never rejects. This holds only while `task()` is invoked lazily inside
 * `run`; the limiter is internal to {@link probeAll}, whose task is
 * {@link probeEndpoint} (never throws). If this is ever exposed for arbitrary
 * tasks, audit that a task throwing synchronously before `active += 1` cannot
 * skew the count.
 */
export function createLimiter(concurrency: number): LimitFunction {
  const max = Math.max(1, Math.floor(concurrency));
  const queue: Array<() => void> = [];
  let active = 0;

  const drain = (): void => {
    active -= 1;

    const run = queue.shift();
    if (run) {
      run();
    }
  };

  return <T>(task: LimitedTask<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = async (): Promise<void> => {
        active += 1;

        try {
          resolve(await task());
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        } finally {
          drain();
        }
      };

      if (active < max) {
        void run();
      } else {
        queue.push(() => void run());
      }
    });
}

/**
 * Probe every `host × port` combination with bounded concurrency and return the
 * reachable endpoints (unsorted, not yet de-duplicated). Failures are dropped.
 */
export async function probeAll(
  hosts: readonly string[],
  ports: readonly number[],
  options: ProbeAllOptions = {},
): Promise<ModelEndpoint[]> {
  const limit = createLimiter(
    options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
  );

  const probes: Array<Promise<ModelEndpoint | null>> = [];
  for (const host of hosts) {
    for (const port of ports) {
      probes.push(limit(() => probeEndpoint(host, port, options)));
    }
  }

  const results = await Promise.all(probes);

  return results.filter((result): result is ModelEndpoint => result !== null);
}
