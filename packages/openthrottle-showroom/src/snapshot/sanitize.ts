/**
 * @description The sanitize pass every row goes through between the FK closure
 * and the JSONL on disk:
 *
 * - `drop` columns are nulled — the value never reaches the snapshot.
 * - `scrub` columns get the identity scrub: emails become deterministic
 *   `localpart-<hash>@atlasworks.example` addresses (rule-based, so no real
 *   address is committed anywhere and distinct addresses never collide), home
 *   directories collapse to `/home/demo`, `*.local` hostnames collapse to
 *   `demo-workstation.local`.
 * - the secret detector then runs over EVERY kept string (keep and scrub
 *   alike) and THROWS on a hit, naming table, column and row id — fail closed,
 *   no silent redaction. Residual risk is accepted explicitly: recordings are
 *   human-reviewed before publishing, nothing goes live automatically.
 * - timestamps are rebased to offsets from a data-independent anchor supplied
 *   by the caller (`{$offsetMs}` / `{$offsetDays}` markers), the same
 *   offset-from-seed-time convention the hero fixture uses, so the loader can
 *   render the frozen snapshot as a recently-active workspace. Rebasing is a constant
 *   shift, so relative ordering is preserved; `plan_output_stream` offsets are
 *   additionally forced strictly increasing and unique per plan.
 */

import { createHash } from 'node:crypto';

import type { SnapshotManifest } from './manifest';
import { assertTableExportable } from './manifest';
import type { DatabaseSchema } from './schema';
import {
  DEMO_EMAIL_DOMAIN,
  DEMO_HOME_PREFIX,
  DEMO_HOSTNAME,
  ORGANISATION_ALIASES,
} from './sanitize.data';

const EMAIL_PATTERN = new RegExp(
  `\\b[A-Za-z0-9._%+-]+@(?!${DEMO_EMAIL_DOMAIN.replace('.', '\\.')})[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b`,
  'g',
);

const HOME_PATH_PATTERN = /\/(?:Users|home)\/[a-zA-Z0-9._-]+/g;

const LOCAL_HOSTNAME_PATTERN = /\b[A-Za-z0-9][A-Za-z0-9-]*\.local\b/g;

/**
 * Deterministic, collision-free email rewrite: the (cleaned) localpart plus a
 * short hash of the full original address, on the demo domain. The hash keeps
 * two distinct real addresses distinct after scrubbing — users.email is unique.
 */
export const scrubEmail = (email: string): string => {
  const localpart = email
    .split('@')[0]
    .split('+')[0]
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
  const hash = createHash('sha256').update(email).digest('hex').slice(0, 6);

  return `${localpart}-${hash}@${DEMO_EMAIL_DOMAIN}`;
};

const ORGANISATION_PATTERNS = Object.entries(ORGANISATION_ALIASES).map(
  ([real, alias]) => ({ alias, pattern: new RegExp(real, 'gi') }),
);

/** Copy the case of the matched text onto the replacement's first letter. */
const matchCase = (matched: string, replacement: string): string =>
  matched[0] === matched[0]?.toUpperCase()
    ? replacement[0].toUpperCase() + replacement.slice(1)
    : replacement;

/** The identity scrub applied to every `scrub`-classified string. */
export const scrubIdentity = (text: string): string => {
  let scrubbed = text
    .replaceAll(EMAIL_PATTERN, (email) => scrubEmail(email))
    .replaceAll(HOME_PATH_PATTERN, DEMO_HOME_PREFIX)
    .replaceAll(LOCAL_HOSTNAME_PATTERN, DEMO_HOSTNAME);

  for (const { alias, pattern } of ORGANISATION_PATTERNS) {
    scrubbed = scrubbed.replaceAll(pattern, (matched) =>
      matchCase(matched, alias),
    );
  }

  return scrubbed;
};

interface SecretRule {
  id: string;
  pattern: RegExp;
}

/** Known key shapes. Any hit stops the export — these are never ambiguous. */
const SECRET_RULES: SecretRule[] = [
  { id: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    id: 'github-token',
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/,
  },
  { id: 'github-pat', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { id: 'provider-key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { id: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  {
    id: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/,
  },
  { id: 'private-key-block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

const CONNECTION_STRING_PATTERN =
  /\b(?:postgres(?:ql)?|mysql|rediss?|mongodb(?:\+srv)?|amqp):\/\/[^\s/:@]+:([^\s@]+)@/g;

/**
 * Committed docs legitimately show connection strings with PLACEHOLDER
 * passwords (`openthrottle_password`, `{{password}}`, `<your-password>`, …).
 * A placeholder is not a credential; anything else in the password slot is.
 */
const isPlaceholderPassword = (password: string): boolean =>
  /^[{$<[]/.test(password) ||
  /password|passwd|example|changeme|change-me|xxx/i.test(password) ||
  /^(?:pass|pwd|secret|postgres|root|admin|test|guest)$/i.test(password);

/**
 * Candidate charset deliberately EXCLUDES '/', '.' and '=': with them included
 * every long path, URL tail and `ENV_VAR=value` assignment in agent output
 * reads as a token (measured 125 false positives, 0 true ones, 2026-08-27). A
 * base64 secret containing '/' now only partially matches, which is accepted:
 * the known-shape rules above catch real provider keys, and this heuristic is
 * the best-effort layer behind them.
 */
const HIGH_ENTROPY_CANDIDATE = /[A-Za-z0-9+_-]{40,}/g;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tokens the entropy heuristic must NOT flag: pure hex (git SHAs, content
 * hashes), UUIDs, and integrity-hash prefixes (`sha512-…` in lockfile talk).
 */
const isKnownSafeToken = (token: string): boolean =>
  /^[0-9a-fA-F]+$/.test(token) ||
  UUID_PATTERN.test(token) ||
  /^sha\d+-/.test(token);

const hasMixedCharacterClasses = (token: string): boolean =>
  /[a-z]/.test(token) && /[A-Z]/.test(token) && /[0-9]/.test(token);

/**
 * Returns a description of the first secret-looking match, or null. Known key
 * shapes always count; long mixed-class tokens count via the entropy heuristic.
 */
export const detectSecret = (text: string): string | null => {
  for (const rule of SECRET_RULES) {
    const match = rule.pattern.exec(text);

    if (match !== null) {
      return `${rule.id}: '${match[0].slice(0, 24)}…'`;
    }
  }

  for (const match of text.matchAll(CONNECTION_STRING_PATTERN)) {
    if (!isPlaceholderPassword(match[1])) {
      return `connection-string-password: '${match[0].slice(0, 24)}…'`;
    }
  }

  // URLs get their own treatment (ids in URL paths are not tokens); mirror the
  // leak scan and strip them before the entropy pass.
  const withoutUrls = text.replaceAll(/https?:\/\/\S+/g, ' ');

  for (const match of withoutUrls.matchAll(HIGH_ENTROPY_CANDIDATE)) {
    const token = match[0];
    const before = withoutUrls.slice(
      Math.max(0, (match.index ?? 0) - 24),
      match.index,
    );

    // Documented non-secret contexts seen in real data: pg_dump's \restrict
    // safety token in dump output, and internal content-blob ids in tool
    // metadata. Neither grants access to anything. Quotes may arrive
    // backslash-escaped when the text is itself embedded in JSONL.
    if (
      /\\restrict\s*$/.test(before) ||
      /\\?"contentBlobId\\?":\s*\\?"?$/.test(before)
    ) {
      continue;
    }

    if (!isKnownSafeToken(token) && hasMixedCharacterClasses(token)) {
      return `high-entropy-string: '${token.slice(0, 24)}…' (${token.length} chars)`;
    }
  }

  return null;
};

/** Marker the loader resolves against seed time: milliseconds from the anchor. */
export interface OffsetMsMarker {
  $offsetMs: number;
}

/** Marker for `date` columns: whole days from the anchor's UTC date. */
export interface OffsetDaysMarker {
  $offsetDays: number;
}

const DAY_MS = 86_400_000;

/**
 * Parse Postgres's raw text timestamp ('2026-08-27 17:49:00.123456+00' or
 * without zone) into epoch milliseconds. Sub-millisecond digits are truncated.
 */
export const parsePostgresTimestamp = (value: string): number => {
  let iso = value.replace(' ', 'T');

  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    iso = `${iso}T00:00:00Z`;
  } else if (/[+-]\d{2}$/.test(iso)) {
    iso = `${iso}:00`;
  } else if (!/[Zz]$|[+-]\d{2}:\d{2}$/.test(iso)) {
    iso = `${iso}Z`;
  }

  const ms = Date.parse(iso);

  if (Number.isNaN(ms)) {
    throw new Error(`unparseable timestamp '${value}'`);
  }

  return ms;
};

const isTimestampType = (columnType: string): boolean =>
  columnType.startsWith('timestamp');

export interface SanitizeContext {
  /** Newest timestamp in the export; offsets are relative to it. */
  anchorIso: string;
  manifest: SnapshotManifest;
  schema: DatabaseSchema;
}

export type RowTransform = (
  table: string,
  row: Record<string, unknown>,
) => Record<string, unknown> | null;

export const createSanitizer = (context: SanitizeContext): RowTransform => {
  const anchorMs = parsePostgresTimestamp(context.anchorIso);
  const anchorDayMs = Math.floor(anchorMs / DAY_MS) * DAY_MS;

  /** plan id → last emitted plan_output_stream offset, for uniqueness. */
  const lastStreamOffsetByPlan = new Map<string, number>();

  return (table, row) => {
    const entry = assertTableExportable(context.manifest, table);
    const tableSchema = context.schema.tables.get(table);

    if (tableSchema === undefined) {
      throw new Error(`sanitizer has no schema for table '${table}'`);
    }

    const rowId = tableSchema.primaryKey
      .map((column) => String(row[column]))
      .join('/');
    const sanitized: Record<string, unknown> = {};

    for (const column of tableSchema.columns) {
      const action = entry.columns[column].action;
      const columnType = tableSchema.columnTypes[column];
      const value = row[column];

      if (action === 'drop' || value === null || value === undefined) {
        sanitized[column] = null;
        continue;
      }

      if (isTimestampType(columnType) && typeof value === 'string') {
        let offsetMs = parsePostgresTimestamp(value) - anchorMs;

        if (table === 'plan_output_stream' && column === 'created_at') {
          const planId = String(row.plan_id);
          const last = lastStreamOffsetByPlan.get(planId);

          if (last !== undefined && offsetMs <= last) {
            offsetMs = last + 1;
          }

          lastStreamOffsetByPlan.set(planId, offsetMs);
        }

        const marker: OffsetMsMarker = { $offsetMs: offsetMs };

        sanitized[column] = marker;
        continue;
      }

      if (columnType === 'date' && typeof value === 'string') {
        const marker: OffsetDaysMarker = {
          $offsetDays: Math.round(
            (parsePostgresTimestamp(value) - anchorDayMs) / DAY_MS,
          ),
        };

        sanitized[column] = marker;
        continue;
      }

      const scrubbed =
        action === 'scrub' && typeof value === 'string'
          ? scrubIdentity(value)
          : value;

      if (typeof scrubbed === 'string') {
        const secret = detectSecret(scrubbed);

        if (secret !== null) {
          throw new Error(
            `secret detected in '${table}.${column}' (row ${rowId}): ${secret} — the export STOPS rather than silently redacting; remove or rotate the value, or teach the detector why it is safe`,
          );
        }
      }

      sanitized[column] = scrubbed;
    }

    return sanitized;
  };
};
