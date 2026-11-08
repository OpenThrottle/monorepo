import { describe, expect, it } from 'vitest';

import {
  type Transcript,
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../../../types/transcript.ts';
import { parseTranscript, serializeTranscript } from '../transcript.ts';

const TRANSCRIPT: Transcript = {
  argv: ['--print', '--', 'hi'],
  exit: { code: 0, signal: null },
  header: {
    backend: 'claude',
    cliVersion: '2.1.0',
    model: 'claude-sonnet-5',
    recordedAt: '2026-11-07T00:00:00.000Z',
    scenario: 'simple-turn',
    schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
    surface: TRANSCRIPT_SURFACES.conversation,
    type: TRANSCRIPT_LINE_TYPES.header,
  },
  stderr: 'warn\n',
  stdin: 'input',
  stdout: ['{"type":"system"}', '{"type":"result"}'],
};

describe('serializeTranscript', () => {
  it('round-trips through parseTranscript', () => {
    expect(parseTranscript(serializeTranscript(TRANSCRIPT))).toEqual({
      ok: true,
      transcript: TRANSCRIPT,
    });
  });

  it('omits empty stdin and stderr lines', () => {
    const text = serializeTranscript({ ...TRANSCRIPT, stderr: '', stdin: '' });

    expect(text.trim().split('\n')).toHaveLength(5);
  });
});

describe('parseTranscript', () => {
  const lines = serializeTranscript(TRANSCRIPT).trim().split('\n');

  describe('when the header is not first', () => {
    it('fails', () => {
      const result = parseTranscript(lines.slice(1).join('\n'));

      expect(result).toEqual({
        error: 'the first line must be the header',
        ok: false,
      });
    });
  });

  describe('when the exit is not last', () => {
    it('fails', () => {
      const result = parseTranscript(lines.slice(0, -1).join('\n'));

      expect(result.ok).toBe(false);
    });
  });

  describe('when the argv line is missing', () => {
    it('fails', () => {
      const withoutArgv = lines.filter((line) => !line.includes('"argv"'));

      expect(parseTranscript(withoutArgv.join('\n'))).toEqual({
        error: 'missing the argv line',
        ok: false,
      });
    });
  });

  describe('when a line is not valid JSON', () => {
    it('fails with its line number', () => {
      const result = parseTranscript([lines[0], 'nope'].join('\n'));

      expect(result).toEqual({
        error: 'line 2 is not a transcript line',
        ok: false,
      });
    });
  });

  describe('when the schema version is unknown', () => {
    it('fails', () => {
      const header = lines[0]?.replace(
        `"schemaVersion":${TRANSCRIPT_SCHEMA_VERSION}`,
        '"schemaVersion":99',
      );

      expect(parseTranscript([header, ...lines.slice(1)].join('\n')).ok).toBe(
        false,
      );
    });
  });
});
