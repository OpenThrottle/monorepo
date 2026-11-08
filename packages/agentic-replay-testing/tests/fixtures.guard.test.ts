/**
 * Guard over every committed transcript: it must parse, and it must not leak
 * anything the sanitizer is meant to strip. A hand-edited or partially
 * sanitized fixture fails here rather than in review.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { findSanitizerLeaks, parseTranscript } from '../src/index.ts';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

const fixtures = readdirSync(FIXTURES_DIR, { recursive: true })
  .map(String)
  .filter((path) => path.endsWith('.ndjson'))
  .toSorted();

describe('committed transcripts', () => {
  it('exist', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  describe.each(fixtures)('%s', (fixture) => {
    const text = readFileSync(join(FIXTURES_DIR, fixture), 'utf8');

    it('parses', () => {
      expect(parseTranscript(text)).toMatchObject({ ok: true });
    });

    it('leaks nothing', () => {
      expect(findSanitizerLeaks(text, { forbidden: [homedir()] })).toEqual([]);
    });

    it('lives under its backend directory', () => {
      const parsed = parseTranscript(text);
      const backend = parsed.ok ? parsed.transcript.header.backend : '';

      expect(fixture.startsWith(`${backend}/`)).toBe(true);
    });
  });
});
