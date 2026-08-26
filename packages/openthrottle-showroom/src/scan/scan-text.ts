/**
 * @description The leak-scan rules engine, separated from the CLI so it can be unit
 * tested without shelling out or touching the filesystem.
 */

import { ALLOWED_HOSTS, DENYLIST, RULES } from './rules';
import type { ScanKind } from './rules';

export interface Finding {
  readonly because: string;
  readonly match: string;
  readonly rule: string;
  readonly severity: 'error' | 'warn';
  readonly source: string;
}

/** Trim a match for display so a wall of base64 does not bury the report. */
const preview = (value: string): string =>
  value.length > 48 ? `${value.slice(0, 45)}…` : value;

const isAllowedUrl = (url: string): boolean =>
  ALLOWED_HOSTS.some((host) => url.includes(host));

/** URLs are checked by their own rule; strip them so they do not also read as entropy. */
const withoutUrls = (text: string): string =>
  text.replaceAll(/https?:\/\/\S+/g, ' ');

export const scanText = (
  source: string,
  text: string,
  kind: ScanKind,
): readonly Finding[] => {
  const findings: Finding[] = [];

  for (const rule of RULES) {
    if (!rule.appliesTo.includes(kind)) {
      continue;
    }

    const subject = rule.id === 'high-entropy' ? withoutUrls(text) : text;
    for (const match of subject.matchAll(rule.pattern)) {
      const value = match[0];

      if (rule.id === 'external-url' && isAllowedUrl(value)) {
        continue;
      }

      findings.push({
        because: rule.because,
        match: preview(value),
        rule: rule.id,
        severity: rule.severity,
        source,
      });
    }
  }

  if (kind !== 'frame') {
    return findings;
  }

  for (const term of DENYLIST) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      findings.push({
        because:
          'The demo fixture is entirely fictional, so a real name on screen means the recording ran against the wrong database.',
        match: term,
        rule: 'denylist',
        severity: 'error',
        source,
      });
    }
  }

  return findings;
};
