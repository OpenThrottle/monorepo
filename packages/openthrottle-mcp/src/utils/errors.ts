/**
 * @description Shared tool error response helpers + error classification.
 *
 * Backend errors from `executeGraphqlWithAuth` can carry GraphQL/HTTP transport
 * detail (target URL, port, server-side stack-ish text). We must never echo that
 * verbatim to the MCP client/LLM. Instead we classify into a small, stable set of
 * categories, return a sanitized client-facing message, and log full detail to
 * stderr (stdout is reserved for the MCP protocol on stdio transports).
 */

function errorContent(message: string): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  return {
    content: [{ text: message, type: 'text' as const }],
    isError: true,
  };
}

/**
 * Structural view of a Zod issue that works for both the `zod/v3` compat
 * schemas (generated `*InputSchema()`) and the native `zod` schemas the ad-hoc
 * tool parameters use — we only read fields common to both.
 */
interface ZodIssueLike {
  readonly code: string;
  readonly message: string;
  readonly minimum?: number | bigint;
  /** zod v4 names the too_small subject `origin`; zod v3 names it `type`. */
  readonly origin?: string;
  readonly path: ReadonlyArray<PropertyKey>;
  readonly received?: unknown;
  readonly type?: string;
}

/** Structural view of a `ZodError` (v3 or v4) — just its issue list. */
interface ZodErrorLike {
  readonly issues: ReadonlyArray<ZodIssueLike>;
}

const isZodErrorLike = (
  value: string | ZodErrorLike,
): value is ZodErrorLike => {
  return typeof value !== 'string';
};

/**
 * Humanize a field path segment to sentence case (camelCase / snake_case →
 * "Start iso"). Mirrors `humanizeFieldLabel` in
 * `@openthrottle/react-router-graphql` (which openthrottle-mcp cannot import —
 * it is a web/source-first package). Kept small and in sync intentionally; a
 * future follow-up extracts the shared rule into a neutral package.
 */
const humanizeLabel = (path: ReadonlyArray<PropertyKey>): string => {
  const named = path.map(String).filter((segment) => !/^\d+$/.test(segment));
  const last = (named.length > 0 ? named : path.map(String)).at(-1) ?? '';
  const words = last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words === '' ? last : words.charAt(0).toUpperCase() + words.slice(1);
};

/** First humanized message per dot-joined field path, joined with `; `. */
const formatZodError = (error: ZodErrorLike): string => {
  const byPath = new Map<string, string>();
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    if (byPath.has(key)) {
      continue;
    }
    const label = humanizeLabel(issue.path);
    if (issue.code === 'invalid_type' && issue.received === 'undefined') {
      byPath.set(key, `${label} is required.`);
    } else if (
      issue.code === 'too_small' &&
      (issue.type === 'string' || issue.origin === 'string') &&
      Number(issue.minimum) <= 1
    ) {
      byPath.set(key, `${label} is required.`);
    } else {
      byPath.set(key, issue.message);
    }
  }
  return [...byPath.values()].join('; ');
};

/**
 * @description Build the `Invalid arguments: …` tool error. Accepts a Zod
 * error (humanized to concise, field-mapped copy — "Content is required." — via
 * {@link formatZodError}) or a pre-formatted string for bespoke guards.
 */
export function invalidArgsContent(parsedError: string | ZodErrorLike): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  const detail = isZodErrorLike(parsedError)
    ? formatZodError(parsedError)
    : parsedError;
  return errorContent(`Invalid arguments: ${detail}`);
}

/**
 * @description Marks an error whose message is author-controlled and safe to
 * return to the MCP client verbatim (e.g. a not-found signal we construct
 * ourselves). Anything thrown that is NOT a SafeToolError is treated as
 * potentially carrying backend/transport detail and is sanitized.
 */
export class SafeToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeToolError';
  }
}

export const errorCategory = {
  auth: 'auth',
  transport: 'transport',
  unknown: 'unknown',
  validation: 'validation',
} as const;

export type ErrorCategory = (typeof errorCategory)[keyof typeof errorCategory];

const sanitizedMessageByCategory: Record<ErrorCategory, string> = {
  [errorCategory.auth]:
    'Authentication failed. Verify OPENTHROTTLE_MCP_AUTH_TOKEN is set and valid.',
  [errorCategory.transport]:
    'Could not reach the OpenThrottle (OT) server. Confirm the server is running and reachable, then retry.',
  [errorCategory.unknown]:
    'The request failed due to an internal error. See server logs for detail.',
  [errorCategory.validation]:
    'The request was rejected as invalid. Check the provided arguments and retry.',
};

const transportHints = [
  'econnrefused',
  'econnreset',
  'enotfound',
  'etimedout',
  'fetch failed',
  'network',
  'socket hang up',
  'timeout',
] as const;

const authHints = [
  '401',
  '403',
  'auth token required',
  'forbidden',
  'unauthenticated',
  'unauthorized',
] as const;

const validationHints = [
  '400',
  '422',
  'bad request',
  'invalid',
  'validation',
] as const;

/**
 * @description Classifies an unknown thrown value into a stable {@link ErrorCategory}
 * by inspecting its (lower-cased) message. Heuristic only — used to pick a sanitized
 * client message, never to surface the raw text.
 * @public
 */
export function classifyError(error: unknown): ErrorCategory {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.toLowerCase();

  if (authHints.some((hint) => message.includes(hint))) {
    return errorCategory.auth;
  }

  if (validationHints.some((hint) => message.includes(hint))) {
    return errorCategory.validation;
  }

  if (transportHints.some((hint) => message.includes(hint))) {
    return errorCategory.transport;
  }

  return errorCategory.unknown;
}

/**
 * @description Returns the stable, sanitized client-facing message for a category.
 * Never contains backend/transport detail.
 * @public
 */
export function sanitizedMessageForCategory(category: ErrorCategory): string {
  return sanitizedMessageByCategory[category];
}

/** Max length of a surfaced application-error detail (keeps the one-liner, bounds any leakage). */
const MAX_APP_ERROR_DETAIL_LEN = 300;

/**
 * @description Extracts the resolver-authored detail from an APPLICATION-level
 * error and returns it verbatim (safe to surface), or null when the error is a
 * transport/internal failure that must stay sanitized.
 *
 * `executeGraphqlWithAuth` (nodejs-graphql) surfaces a server HttpException as
 * `GraphQL errors: <message>` (HTTP 200 + errors array) or, for a 400/422 client
 * error, `openthrottle-server GraphQL error 400: <message>`. Those messages are
 * client-facing by construction (e.g. a BadRequest listing the valid statuses), so
 * we return them so the caller sees the actionable reason instead of the generic
 * "rejected as invalid". Transport/HTTP 5xx errors (target URL, port, stack-ish
 * text) do NOT match and remain sanitized. Only the first line is returned, length
 * capped, so a dev-mode server that appends a stack trace cannot leak it.
 * @public
 */
export function extractApplicationErrorDetail(
  rawMessage: string,
): string | null {
  const match =
    rawMessage.match(/^GraphQL errors:\s*([\s\S]+)$/) ??
    rawMessage.match(
      /^openthrottle-server GraphQL error (?:400|422):\s*([\s\S]+)$/,
    );

  if (match == null) return null;

  const detail = match[1].trim();
  if (detail === '' || detail.toLowerCase() === 'unknown') return null;

  const firstLine = detail.split('\n', 1)[0]?.trim() ?? '';
  if (firstLine === '') return null;

  return firstLine.length > MAX_APP_ERROR_DETAIL_LEN
    ? `${firstLine.slice(0, MAX_APP_ERROR_DETAIL_LEN)}…`
    : firstLine;
}

/**
 * @description Classifies an error, logs the full detail to stderr (server-side
 * only — never returned to the client), and returns the sanitized client-facing
 * message. Use anywhere a caught backend error would otherwise be interpolated
 * into a tool/resource result.
 * @param context - Short label for the log line (e.g. tool name or resource name).
 * @returns The sanitized message safe to return to the MCP client.
 */
export function toSanitizedClientMessage(
  context: string,
  error: unknown,
): string {
  // Author-controlled messages (e.g. not-found signals) are safe to surface.
  if (error instanceof SafeToolError) {
    return error.message;
  }

  // Application-level (resolver-authored) validation/business errors carry an
  // actionable, client-facing message — surface it instead of the generic string.
  const raw = error instanceof Error ? error.message : String(error);
  const appDetail = extractApplicationErrorDetail(raw);
  if (appDetail != null) {
    // stderr only; stdout is the MCP protocol channel on stdio transports.
    console.error(`[openthrottle-mcp] ${context} failed (validation):`, error);
    return appDetail;
  }

  const category = classifyError(error);

  // stderr only; stdout is the MCP protocol channel on stdio transports.
  console.error(`[openthrottle-mcp] ${context} failed (${category}):`, error);

  return sanitizedMessageForCategory(category);
}
