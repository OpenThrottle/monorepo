import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AcpTranscript, Transcript } from '../../types/transcript.ts';
import {
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_PROTOCOLS,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../../types/transcript.ts';
import {
  parseCliTranscript,
  parseTranscript,
  serializeTranscript,
} from '../transcript.ts';

const FIXTURES_DIR = join(import.meta.dirname, '..', '..', '..', 'fixtures');

const TRANSCRIPT: Transcript = {
  argv: ['--print', '--', 'hi'],
  exit: { code: 0, signal: null },
  header: {
    backend: 'claude',
    cliVersion: '2.1.0',
    model: 'claude-sonnet-5',
    protocol: undefined,
    recordedAt: '2026-11-07T00:00:00.000Z',
    scenario: 'simple-turn',
    schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
    surface: TRANSCRIPT_SURFACES.conversation,
    type: TRANSCRIPT_LINE_TYPES.header,
  },
  protocol: TRANSCRIPT_PROTOCOLS.cli,
  stderr: 'warn\n',
  stdin: 'input',
  stdout: ['{"type":"system"}', '{"type":"result"}'],
};

const ACP_TRANSCRIPT: AcpTranscript = {
  argv: ['acp'],
  exit: { code: 0, signal: null },
  frames: [
    {
      from: 'client',
      message: { id: 0, jsonrpc: '2.0', method: 'initialize' },
    },
    { from: 'agent', message: { id: 0, jsonrpc: '2.0', result: {} } },
    { from: 'agent', message: { jsonrpc: '2.0', method: 'session/update' } },
  ],
  header: { ...TRANSCRIPT.header, protocol: TRANSCRIPT_PROTOCOLS.acp },
  protocol: TRANSCRIPT_PROTOCOLS.acp,
  stderr: 'note\n',
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

describe('cli transcripts', () => {
  const fixtures = readdirSync(FIXTURES_DIR, { recursive: true })
    .map(String)
    .filter((path) => path.endsWith('.ndjson'))
    .toSorted();

  it('exist to round-trip', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  it.each(fixtures)('%s re-serializes byte for byte', (fixture) => {
    const text = readFileSync(join(FIXTURES_DIR, fixture), 'utf8');
    const parsed = parseTranscript(text);

    expect(parsed.ok && serializeTranscript(parsed.transcript)).toBe(text);
  });

  it('never writes protocol, and reads a missing one as cli', () => {
    const text = serializeTranscript(TRANSCRIPT);
    const parsed = parseTranscript(text);

    expect(text).not.toContain('protocol');
    expect(parsed.ok && parsed.transcript.protocol).toBe('cli');
  });

  it('rejects rpc lines', () => {
    const lines = serializeTranscript(TRANSCRIPT).trim().split('\n');
    const rpc = JSON.stringify({ from: 'client', message: {}, type: 'rpc' });

    const result = parseTranscript(
      [...lines.slice(0, -1), rpc, lines.at(-1)].join('\n'),
    );

    expect(result).toEqual({
      error: 'a cli transcript carries no rpc lines',
      ok: false,
    });
  });
});

describe('acp transcripts', () => {
  const text = serializeTranscript(ACP_TRANSCRIPT);

  it('round-trip, frames in wire order', () => {
    expect(parseTranscript(text)).toEqual({
      ok: true,
      transcript: ACP_TRANSCRIPT,
    });
  });

  it('write protocol on the header and one rpc line per frame', () => {
    const lines = text.trim().split('\n');

    expect(lines[0]).toContain('"protocol":"acp"');
    expect(lines.filter((line) => line.includes('"type":"rpc"'))).toHaveLength(
      3,
    );
  });

  it.each([
    ['stdin', { channel: 'stdin', data: 'x', type: 'outbound' }],
    ['stdout', { channel: 'stdout', data: 'x', type: 'inbound' }],
  ])('reject %s lines', (channel, extra) => {
    const lines = text.trim().split('\n');

    const result = parseTranscript(
      [...lines.slice(0, -1), JSON.stringify(extra), lines.at(-1)].join('\n'),
    );

    expect(result).toEqual({
      error: `an acp transcript carries no ${channel} lines`,
      ok: false,
    });
  });

  it('are refused by parseCliTranscript', () => {
    expect(parseCliTranscript(text)).toMatchObject({ ok: false });
  });

  it('are accepted as cli by parseCliTranscript only when cli', () => {
    expect(parseCliTranscript(serializeTranscript(TRANSCRIPT))).toMatchObject({
      ok: true,
    });
  });
});
