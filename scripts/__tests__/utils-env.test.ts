import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  parseEnvContents,
  readEnvFile,
  readEnvValue,
  setEnvValue,
  updateEnvValue,
} from '../utils/env.ts';

describe('parseEnvContents', () => {
  it('parses KEY=VALUE lines and ignores comments and blanks', () => {
    const parsed = parseEnvContents(
      ['# a comment', '', 'FOO=bar', 'BAZ=qux', 'not a pair'].join('\n'),
    );

    expect(parsed).toEqual({ BAZ: 'qux', FOO: 'bar' });
  });

  it('strips matching single and double quotes', () => {
    const parsed = parseEnvContents(['A="quoted"', "B='single'", 'C="unbalanced'].join('\n')); // prettier-ignore

    expect(parsed).toEqual({ A: 'quoted', B: 'single', C: '"unbalanced' });
  });

  it('keeps the LAST assignment for duplicate keys (tail -1 semantics)', () => {
    const parsed = parseEnvContents(['PORT=1000', 'PORT=2000'].join('\n'));

    expect(parsed).toEqual({ PORT: '2000' });
  });

  it('accepts an export prefix and preserves = inside values', () => {
    const parsed = parseEnvContents('export URL=https://x?a=b');

    expect(parsed).toEqual({ URL: 'https://x?a=b' });
  });
});

describe('readEnvFile / readEnvValue', () => {
  const dir = mkdtempSync(join(tmpdir(), 'utils-env-'));
  const file = join(dir, '.env');
  writeFileSync(file, 'OPENTHROTTLE_SERVER_PORT=7421\nEMPTY=\n');

  it('reads a real file', () => {
    expect(readEnvFile(file)).toEqual({
      EMPTY: '',
      OPENTHROTTLE_SERVER_PORT: '7421',
    });
  });

  it('returns an empty map for a missing file', () => {
    expect(readEnvFile(join(dir, 'nope.env'))).toEqual({});
  });

  it('falls back for missing keys and empty values', () => {
    expect(readEnvValue(file, 'OPENTHROTTLE_SERVER_PORT', '6021')).toBe('7421');
    expect(readEnvValue(file, 'MISSING', '6020')).toBe('6020');
    expect(readEnvValue(file, 'EMPTY', 'fallback')).toBe('fallback');
  });
});

describe('setEnvValue', () => {
  it('keeps double quotes and a trailing comment', () => {
    expect(setEnvValue('A="1" # note\nB=2\n', 'A', '9')).toBe(
      'A="9" # note\nB=2\n',
    );
  });

  it('keeps an unquoted style and single quotes', () => {
    expect(setEnvValue('A=1\n', 'A', '9')).toBe('A=9\n');
    expect(setEnvValue("A='1'\n", 'A', '9')).toBe("A='9'\n");
  });

  it('appends when absent and does not match a longer key', () => {
    expect(setEnvValue('XA=1\n', 'A', '9')).toBe('XA=1\nA=9\n');
  });
});

describe('updateEnvValue', () => {
  it('rewrites from the current unquoted value, keeping quotes and the comment', () => {
    expect(
      updateEnvValue('U="a:1" # c\n', 'U', (v) => v.replace('1', '2')),
    ).toBe('U="a:2" # c\n');
  });

  it('leaves contents alone when the key is absent', () => {
    expect(updateEnvValue('A=1\n', 'U', () => 'x')).toBe('A=1\n');
  });
});
