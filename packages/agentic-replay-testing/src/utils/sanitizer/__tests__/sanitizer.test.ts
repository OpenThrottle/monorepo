import { describe, expect, it } from 'vitest';

import {
  type Transcript,
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../../../types/transcript.ts';
import {
  createSanitizer,
  DEFAULT_REDACT_KEYS,
  findSanitizerLeaks,
  placeholderUuid,
  REDACTED,
  REDACTED_EMAIL,
} from '../sanitizer.ts';

const HOME = '/Users/alice';
const CWD = '/Users/alice/work/repo';

const newSanitizer = (): ReturnType<typeof createSanitizer> => {
  return createSanitizer({
    paths: [
      { path: HOME, token: '<HOME>' },
      { path: CWD, token: '<CWD>' },
    ],
    redactKeys: DEFAULT_REDACT_KEYS,
  });
};

const transcript = (overrides: Partial<Transcript>): Transcript => {
  return {
    argv: [],
    exit: { code: 0, signal: null },
    header: {
      backend: 'claude',
      cliVersion: '2.1.0',
      model: null,
      recordedAt: '2026-11-07T00:00:00.000Z',
      scenario: 'simple-turn',
      schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
      surface: TRANSCRIPT_SURFACES.conversation,
      type: TRANSCRIPT_LINE_TYPES.header,
    },
    stderr: '',
    stdin: '',
    stdout: [],
    ...overrides,
  };
};

describe('sanitizeText', () => {
  describe('paths', () => {
    it('replaces the longest matching path first', () => {
      const result = newSanitizer().sanitizeText(
        `${CWD}/src and ${HOME}/.claude`,
      );

      expect(result).toBe('<CWD>/src and <HOME>/.claude');
    });

    it('ignores root-like paths that would match everything', () => {
      const sanitizer = createSanitizer({
        paths: [{ path: '/', token: '<ROOT>' }],
        redactKeys: [],
      });

      expect(sanitizer.sanitizeText('/usr/bin')).toBe('/usr/bin');
    });
  });

  describe('emails', () => {
    it('replaces every email with the placeholder address', () => {
      const result = newSanitizer().sanitizeText('owner: alice.b+ot@corp.io');

      expect(result).toBe(`owner: ${REDACTED_EMAIL}`);
    });
  });

  describe('tokens', () => {
    it.each([
      ['an Anthropic key', 'sk-ant-api03-abcdefghijklmnop'],
      ['an OpenAI key', 'sk-proj1234567890abcdefghij'],
      ['a GitHub token', 'ghp_abcdefghijklmnopqrstuvwxyz'],
      ['a bearer header', 'Bearer abc.def-123'],
      ['a JWT', 'eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2Q'],
    ])('redacts %s', (_label, secret) => {
      expect(newSanitizer().sanitizeText(`x ${secret} y`)).toBe(
        `x ${REDACTED} y`,
      );
    });
  });

  describe('uuids', () => {
    it('maps each distinct uuid to a stable placeholder in order', () => {
      const sanitizer = newSanitizer();
      const first = 'aaaaaaaa-1111-4111-8111-111111111111';
      const second = 'bbbbbbbb-2222-4222-8222-222222222222';

      const result = sanitizer.sanitizeText(
        `${first} ${second} ${first.toUpperCase()}`,
      );

      expect(result).toBe(
        `${placeholderUuid(1)} ${placeholderUuid(2)} ${placeholderUuid(1)}`,
      );
    });

    it('leaves placeholder uuids alone without consuming an index', () => {
      const sanitizer = newSanitizer();

      expect(sanitizer.sanitizeText(placeholderUuid(1))).toBe(
        placeholderUuid(1),
      );
      expect(
        sanitizer.sanitizeText('cccccccc-3333-4333-8333-333333333333'),
      ).toBe(placeholderUuid(1));
    });
  });
});

describe('sanitizeTranscript', () => {
  it('sanitizes argv, stdin and stderr as text', () => {
    const result = newSanitizer().sanitizeTranscript(
      transcript({
        argv: ['--add-dir', `${CWD}/docs`],
        stderr: `failed in ${HOME}`,
        stdin: 'mail me at a@b.co',
      }),
    );

    expect(result.argv).toEqual(['--add-dir', '<CWD>/docs']);
    expect(result.stderr).toBe('failed in <HOME>');
    expect(result.stdin).toBe(`mail me at ${REDACTED_EMAIL}`);
  });

  describe('when a stdout line is JSON', () => {
    it('redacts account-config keys and sanitizes nested strings', () => {
      const line = JSON.stringify({
        apiKeySource: 'ANTHROPIC_API_KEY',
        cwd: CWD,
        nested: { files: [`${CWD}/a.ts`] },
        plugins: [{ name: 'private-plugin', path: `${HOME}/p` }],
        type: 'system',
      });

      const [result] = newSanitizer().sanitizeTranscript(
        transcript({ stdout: [line] }),
      ).stdout;

      expect(JSON.parse(result ?? '')).toEqual({
        apiKeySource: REDACTED,
        cwd: '<CWD>',
        nested: { files: ['<CWD>/a.ts'] },
        plugins: REDACTED,
        type: 'system',
      });
    });
  });

  describe('when a stdout line is not JSON', () => {
    it('sanitizes it as text', () => {
      const [result] = newSanitizer().sanitizeTranscript(
        transcript({ stdout: [`warning: ${HOME}/x`] }),
      ).stdout;

      expect(result).toBe('warning: <HOME>/x');
    });
  });

  it('keeps one uuid map across argv and stdout', () => {
    const session = 'dddddddd-4444-4444-8444-444444444444';
    const result = newSanitizer().sanitizeTranscript(
      transcript({
        argv: ['--session-id', session],
        stdout: [JSON.stringify({ session_id: session })],
      }),
    );

    expect(result.argv[1]).toBe(placeholderUuid(1));
    expect(result.stdout[0]).toContain(placeholderUuid(1));
  });

  it('leaves the header and exit untouched', () => {
    const input = transcript({ exit: { code: 1, signal: null } });

    const result = newSanitizer().sanitizeTranscript(input);

    expect(result.header).toBe(input.header);
    expect(result.exit).toBe(input.exit);
  });
});

describe('findSanitizerLeaks', () => {
  describe('when the text is clean', () => {
    it('reports nothing', () => {
      expect(
        findSanitizerLeaks(`<CWD> ${REDACTED_EMAIL}`, { forbidden: [HOME] }),
      ).toEqual([]);
    });
  });

  describe('when the text leaks', () => {
    it('reports forbidden values, emails and tokens', () => {
      const leaks = findSanitizerLeaks(
        `${HOME}/x bob@corp.io ghp_abcdefghijklmnopqrstuvwxyz`,
        { forbidden: [HOME] },
      );

      expect(leaks).toHaveLength(3);
    });
  });
});
