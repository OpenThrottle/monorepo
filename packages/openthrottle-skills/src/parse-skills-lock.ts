/**
 * @description Reads the repo-root `skills-lock.json` — the skills CLI's ledger
 * of externally installed skills (real directories under `.agents/skills/`).
 * Provenance is derived from it virtually: a slug present here is an external
 * install, and its `source` yields the origin URL. Nothing is ever written
 * back; installed skills stay byte-for-byte 1:1 with upstream.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

/** @public */
export const SKILLS_LOCK_FILENAME = 'skills-lock.json';

/** One installed skill's lockfile entry, narrowed to the provenance fields. */
export interface SkillsLockEntry {
  readonly source: string;
  readonly sourceType: string;
}

/** @public */
export type SkillsLockMap = Readonly<Record<string, SkillsLockEntry>>;

/**
 * @description Parses `skills-lock.json` content to a slug → entry map.
 * Tolerant by contract: malformed JSON, a missing `skills` object, or entries
 * without a string `source` yield an empty/partial map instead of throwing —
 * derivation then falls back to "external, no origin URL".
 * @public
 */
export const parseSkillsLockFile = (content: string): SkillsLockMap => {
  let document: unknown;
  try {
    document = JSON.parse(content);
  } catch {
    return {};
  }

  if (!isRecord(document) || !isRecord(document.skills)) {
    return {};
  }

  const entries: Record<string, SkillsLockEntry> = {};
  for (const [slug, value] of Object.entries(document.skills)) {
    if (!isRecord(value) || typeof value.source !== 'string') {
      continue;
    }
    entries[slug] = {
      source: value.source,
      sourceType: typeof value.sourceType === 'string' ? value.sourceType : '',
    };
  }

  return entries;
};

/**
 * @description Derives an origin URL from a lockfile entry: full URLs pass
 * through; `github` shorthand (`owner/repo`) expands to a github.com URL;
 * anything else yields `undefined` (external, unknown origin).
 * @public
 */
export const deriveSkillSourceUrl = (
  entry: SkillsLockEntry | undefined,
): string | undefined => {
  if (!entry || entry.source.trim().length === 0) {
    return undefined;
  }
  const source = entry.source.trim();
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return source;
  }
  return entry.sourceType === 'github'
    ? `https://github.com/${source}`
    : undefined;
};
