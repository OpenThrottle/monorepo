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

export function invalidArgsContent(parsedError: string): {
  content: { text: string; type: 'text' }[];
  isError: true;
} {
  return errorContent(`Invalid arguments: ${parsedError}`);
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
