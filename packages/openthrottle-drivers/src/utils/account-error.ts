/**
 * @description Shared fatal-account-error signal for Claude Code. When the account the CLI bills
 * against cannot serve requests at all — no credit left, a bad or revoked key, no access — every
 * request fails the same way, so retrying is pointless. Unlike a usage limit (see
 * `usage-limit.ts`) nothing lifts on its own: a human must fix the account.
 *
 * The CLI reports it as a synthetic `assistant` event whose top-level `error` names the class
 * (`isApiErrorMessage: true` in the session transcript), followed by an error `result`. The class
 * is the key; the human text is carried along for diagnostics but never matched on.
 */

/**
 * @description The fatal account-error classes, as the Anthropic API names them. Claude Code also
 * reports `authentication_failed` for an invalid key; it is folded into `authenticationError`.
 * @public
 */
export const ACCOUNT_ERROR_KINDS = {
  authenticationError: 'authentication_error',
  billingError: 'billing_error',
  permissionError: 'permission_error',
} as const;

/**
 * @description One of the {@link ACCOUNT_ERROR_KINDS} values.
 * @public
 */
export type AccountErrorKind =
  (typeof ACCOUNT_ERROR_KINDS)[keyof typeof ACCOUNT_ERROR_KINDS];

/**
 * @description A fatal account error the agent CLI hit. `message` is the CLI's human text (for
 * example "Credit balance is too low"), or null when it reported none.
 * @public
 */
export interface AccountError {
  readonly kind: AccountErrorKind;
  readonly message: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/** Wire error names → kind. Anything absent (rate_limit, server_error, …) is not fatal. */
const WIRE_ERROR_KINDS: Readonly<Record<string, AccountErrorKind>> = {
  authentication_error: ACCOUNT_ERROR_KINDS.authenticationError,
  authentication_failed: ACCOUNT_ERROR_KINDS.authenticationError,
  billing_error: ACCOUNT_ERROR_KINDS.billingError,
  permission_error: ACCOUNT_ERROR_KINDS.permissionError,
};

/** HTTP statuses on an error `result` that only ever mean a fatal account error. */
const STATUS_ERROR_KINDS: Readonly<Record<number, AccountErrorKind>> = {
  401: ACCOUNT_ERROR_KINDS.authenticationError,
  403: ACCOUNT_ERROR_KINDS.permissionError,
};

/** The kind for an `error` value, whether a bare name or an `{ type }` object. */
const kindOfWireError = (value: unknown): AccountErrorKind | null => {
  const name = isRecord(value) ? value.type : value;

  if (typeof name !== 'string') {
    return null;
  }

  return WIRE_ERROR_KINDS[name] ?? null;
};

/** The joined `text` blocks of an `assistant` event's message, or null when there are none. */
const assistantText = (event: Record<string, unknown>): string | null => {
  const message = event.message;
  const content = isRecord(message) ? message.content : undefined;

  if (!Array.isArray(content)) {
    return null;
  }

  const text = content
    .filter((block): block is Record<string, unknown> => {
      return isRecord(block) && block.type === 'text';
    })
    .map((block) => {
      return typeof block.text === 'string' ? block.text : '';
    })
    .join('\n')
    .trim();

  return text === '' ? null : text;
};

const fromAssistant = (event: Record<string, unknown>): AccountError | null => {
  const message = event.message;
  const kind =
    kindOfWireError(event.error) ??
    (isRecord(message) ? kindOfWireError(message.error) : null);

  return kind === null ? null : { kind, message: assistantText(event) };
};

const fromResult = (event: Record<string, unknown>): AccountError | null => {
  if (event.is_error !== true) {
    return null;
  }

  const status = event.api_error_status;
  const statusKind =
    typeof status === 'number' ? (STATUS_ERROR_KINDS[status] ?? null) : null;
  const kind = kindOfWireError(event.error) ?? statusKind;
  const text = typeof event.result === 'string' ? event.result.trim() : '';

  return kind === null ? null : { kind, message: text === '' ? null : text };
};

/**
 * @description Parse one Claude `stream-json` event into an {@link AccountError}, or null when it
 * is not one. Matches an `assistant` event whose `error` is a fatal class, and an error `result`
 * whose `error` is a fatal class or whose `api_error_status` is 401/403. Non-fatal API errors
 * (`rate_limit`, `server_error`, `overloaded_error`, `invalid_request`, …) return null.
 * @public
 */
export const parseClaudeAccountError = (
  event: unknown,
): AccountError | null => {
  if (!isRecord(event)) {
    return null;
  }

  if (event.type === 'assistant') {
    return fromAssistant(event);
  }

  if (event.type === 'result') {
    return fromResult(event);
  }

  return null;
};

/**
 * @description Which credential the CLI authenticated with, from its `system`/`init` event:
 * `ANTHROPIC_API_KEY` when it billed an API key from the environment; any other value means it
 * did not (the host login). Returned verbatim. Null for any other event, or when the CLI did not
 * report it.
 * @public
 */
export const parseClaudeApiKeySource = (event: unknown): string | null => {
  if (!isRecord(event) || event.type !== 'system' || event.subtype !== 'init') {
    return null;
  }

  return typeof event.apiKeySource === 'string' ? event.apiKeySource : null;
};
