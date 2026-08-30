import type {
  FetchRemoteModelsOptions,
  RemoteModel,
  RemoteModelCatalog,
} from '../../types/remote-models.ts';
import { RemoteModelProviderId } from '../../types/remote-models.ts';
import { DEFAULT_REMOTE_CATALOG_TIMEOUT_MS } from './constants.ts';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === `object` && value !== null;
}

/** Strip trailing slashes so `${base}/models` never doubles up. */
function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/u, ``);
}

/**
 * Map one raw catalog entry to a {@link RemoteModel}, or `null` when it is not
 * usable. Verified against the live response (2026-08-29, 396 entries): `id`,
 * `name` and `context_length` are present on every entry, while `reasoning`,
 * `benchmarks` and `alias_target` are not — so only the three fields we
 * actually surface are required, and everything else is ignored rather than
 * validated. Unusable entries are skipped, never thrown on.
 */
function toRemoteModel(entry: unknown): RemoteModel | null {
  if (!isObject(entry)) {
    return null;
  }

  const { context_length: contextLength, id, name } = entry;
  if (typeof id !== `string` || id.length === 0) {
    return null;
  }
  if (typeof name !== `string` || name.length === 0) {
    return null;
  }
  if (typeof contextLength !== `number` || !Number.isFinite(contextLength)) {
    return null;
  }

  return {
    contextLength,
    id,
    name,
    provider: RemoteModelProviderId.openrouter,
  };
}

/**
 * Sort by `id` and drop duplicate ids (first wins), so the catalog is stable
 * and snapshot-testable. Note that suffixed routes (`…:free`, `…:batch`) are
 * DISTINCT ids and are deliberately preserved — they are separate routes, not
 * duplicates of the base slug.
 */
function sortAndDedupe(models: readonly RemoteModel[]): RemoteModel[] {
  const byId = new Map<string, RemoteModel>();
  for (const model of models) {
    if (!byId.has(model.id)) {
      byId.set(model.id, model);
    }
  }

  return [...byId.values()].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
}

/** An empty catalog — the degraded result for every failure mode. */
function emptyCatalog(fetchedAt: string): RemoteModelCatalog {
  return {
    fetchedAt,
    models: [],
    provider: RemoteModelProviderId.openrouter,
  };
}

/**
 * Fetch OpenRouter's model catalog from `GET {baseUrl}/models`.
 *
 * Tolerant by construction, exactly like the local probe: a non-2xx response, a
 * network failure, an abort, an unparseable body or a body that is not shaped
 * like `{ data: [...] }` all yield an EMPTY catalog rather than an exception,
 * and individual malformed entries are skipped. The caller therefore never
 * needs a try/catch to keep a page loading.
 *
 * The API key is optional — OpenRouter serves this catalog unauthenticated
 * (verified 2026-08-29: `http=200` with no `Authorization` header). It is sent
 * when supplied so an operator key still attributes the request, and it is
 * never logged or echoed into a return value.
 *
 * @public
 */
export async function fetchOpenRouterModels(
  options: FetchRemoteModelsOptions,
): Promise<RemoteModelCatalog> {
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_REMOTE_CATALOG_TIMEOUT_MS;

  const headers: Record<string, string> = {
    accept: `application/json`,
    ...options.headers,
  };
  if (options.apiKey !== undefined && options.apiKey !== ``) {
    headers.authorization = `Bearer ${options.apiKey}`;
  }

  let payload: unknown;
  try {
    const response = await fetchImpl(
      `${normalizeBaseUrl(options.baseUrl)}/models`,
      { headers, signal: AbortSignal.timeout(timeoutMs) },
    );
    if (!response.ok) {
      return emptyCatalog(fetchedAt);
    }
    payload = await response.json();
  } catch {
    return emptyCatalog(fetchedAt);
  }

  if (!isObject(payload) || !Array.isArray(payload.data)) {
    return emptyCatalog(fetchedAt);
  }

  const models: RemoteModel[] = [];
  for (const entry of payload.data) {
    const model = toRemoteModel(entry);
    if (model !== null) {
      models.push(model);
    }
  }

  return {
    fetchedAt,
    models: sortAndDedupe(models),
    provider: RemoteModelProviderId.openrouter,
  };
}
