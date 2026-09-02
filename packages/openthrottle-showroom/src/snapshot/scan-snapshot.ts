/**
 * @description The leak gate over the COMMITTED snapshot files, run from the
 * package's test target so CI fails if a leak lands in `src/snapshot/data/`.
 *
 * Deliberately a different rule set from `scan/rules.ts`: the frame denylist
 * (github usernames, the repo name, the product domain) is WRONG for imported
 * data — those are kept on purpose, the repo is public. What must never appear
 * in a committed snapshot is narrower and absolute:
 *
 * - a secret (same detector that gates the export — belt and braces),
 * - a real email address (everything should be on the demo domain),
 * - a real home directory (everything should be /home/demo),
 * - a real machine hostname (everything .local should be the demo hostname).
 */

import { DEMO_HOME_PREFIX, DEMO_HOSTNAME } from './sanitize.data';
import { detectSecret } from './sanitize';

export interface SnapshotFinding {
  /** What matched, trimmed for display. */
  match: string;
  rule: string;
  /** The snapshot file (or fixture label) the finding came from. */
  source: string;
}

const EMAIL_PATTERN =
  /\b[A-Za-z0-9._%+-]+@(?!atlasworks\.example)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const HOME_PATH_PATTERN = /\/(?:Users|home)\/[a-zA-Z0-9._-]+/g;

const LOCAL_HOSTNAME_PATTERN = /\b[A-Za-z0-9][A-Za-z0-9-]*\.local\b/g;

/**
 * npm scopes read like emails to a naive pattern (`@scope/pkg`) — they are
 * not addresses. An email match immediately followed by `/` is a scope.
 */
const isNpmScope = (text: string, matchIndex: number, match: string): boolean =>
  text[matchIndex + match.length] === '/';

const preview = (value: string): string =>
  value.length > 48 ? `${value.slice(0, 45)}…` : value;

/** Scan one snapshot line (or any text) for committed-data leaks. */
export const scanSnapshotText = (
  source: string,
  text: string,
): SnapshotFinding[] => {
  const findings: SnapshotFinding[] = [];

  const secret = detectSecret(text);

  if (secret !== null) {
    findings.push({ match: preview(secret), rule: 'secret', source });
  }

  for (const match of text.matchAll(EMAIL_PATTERN)) {
    if (!isNpmScope(text, match.index ?? 0, match[0])) {
      findings.push({
        match: preview(match[0]),
        rule: 'real-email',
        source,
      });
    }
  }

  for (const match of text.matchAll(HOME_PATH_PATTERN)) {
    if (!match[0].startsWith(DEMO_HOME_PREFIX)) {
      findings.push({
        match: preview(match[0]),
        rule: 'real-home-path',
        source,
      });
    }
  }

  for (const match of text.matchAll(LOCAL_HOSTNAME_PATTERN)) {
    if (match[0] !== DEMO_HOSTNAME) {
      findings.push({
        match: preview(match[0]),
        rule: 'real-hostname',
        source,
      });
    }
  }

  return findings;
};
