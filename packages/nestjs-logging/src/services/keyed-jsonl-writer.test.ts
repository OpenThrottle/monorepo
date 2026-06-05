import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { KeyedJsonlWriter } from './keyed-jsonl-writer';
import { KeyedJsonlWriterError } from './keyed-jsonl-writer.error';

describe('KeyedJsonlWriter', () => {
  let baseDir: string;

  const mkBase = async (): Promise<string> => {
    baseDir = await mkdtemp(path.join(os.tmpdir(), 'keyed-jsonl-'));

    return baseDir;
  };

  it('throws INVALID_KEY for empty or whitespace-only queue or job id', async () => {
    const w = new KeyedJsonlWriter({
      runOutputBaseDirectory: await mkBase(),
    });

    expect(() =>
      w.appendRunChunk('', '1', { data: 'x', type: 'stdout' }),
    ).toThrow(KeyedJsonlWriterError);
    expect(() =>
      w.appendRunChunk('q', '  ', { data: 'x', type: 'stdout' }),
    ).toThrow(KeyedJsonlWriterError);
    await w.closeAll();
  });

  it('writes jsonl lines with timestamp, type, and data', async () => {
    const w = new KeyedJsonlWriter({ runOutputBaseDirectory: await mkBase() });

    w.appendRunChunk('q', '1', {
      data: 'hello',
      timestamp: '2026-05-02T12:00:00.000Z',
      type: 'stdout',
    });
    await w.close('q', '1');

    const text = await readFile(path.join(baseDir, 'q/1.jsonl'), 'utf8');

    expect(JSON.parse(text.trim())).toEqual({
      data: 'hello',
      timestamp: '2026-05-02T12:00:00.000Z',
      type: 'stdout',
    });
    await w.closeAll();
  });

  it('writes the optional source tag when provided and omits it otherwise', async () => {
    const w = new KeyedJsonlWriter({ runOutputBaseDirectory: await mkBase() });

    w.appendRunChunk('q', '1', {
      data: 'tagged',
      source: 'cursor-agent',
      timestamp: '2026-05-02T12:00:00.000Z',
      type: 'stdout',
    });
    w.appendRunChunk('q', '1', {
      data: 'untagged',
      timestamp: '2026-05-02T12:00:01.000Z',
      type: 'stdout',
    });
    await w.close('q', '1');

    const lines = (await readFile(path.join(baseDir, 'q/1.jsonl'), 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    expect(lines[0]).toEqual({
      data: 'tagged',
      source: 'cursor-agent',
      timestamp: '2026-05-02T12:00:00.000Z',
      type: 'stdout',
    });
    expect(lines[1]).not.toHaveProperty('source');
    await w.closeAll();
  });

  it('uses .log for raw lineFormat and does not add delimiters', async () => {
    const w = new KeyedJsonlWriter({
      lineFormat: 'raw',
      runOutputBaseDirectory: await mkBase(),
    });

    w.appendRunChunk('q', '9', 'partial');
    w.appendRunChunk('q', '9', '\n');
    await w.close('q', '9');

    const text = await readFile(path.join(baseDir, 'q/9.log'), 'utf8');

    expect(text).toBe('partial\n');
    await w.closeAll();
  });

  it('rejects wrong chunk shape for the configured lineFormat', async () => {
    const jsonl = new KeyedJsonlWriter({
      runOutputBaseDirectory: await mkBase(),
    });

    expect(() => jsonl.appendRunChunk('q', '1', 'oops')).toThrow(
      KeyedJsonlWriterError,
    );
    await jsonl.closeAll();

    const raw = new KeyedJsonlWriter({
      lineFormat: 'raw',
      runOutputBaseDirectory: await mkBase(),
    });

    expect(() =>
      raw.appendRunChunk('q', '1', { data: 'x', type: 'stdout' }),
    ).toThrow(KeyedJsonlWriterError);
    await raw.closeAll();
  });

  it('resolves collision when two jobs sanitize to the same default path', async () => {
    const w = new KeyedJsonlWriter({ runOutputBaseDirectory: await mkBase() });

    w.appendRunChunk('queue', 'a/b', {
      data: 'first',
      timestamp: '2026-05-02T12:00:00.000Z',
      type: 'stdout',
    });
    w.appendRunChunk('queue', 'a_b', {
      data: 'second',
      timestamp: '2026-05-02T12:00:01.000Z',
      type: 'stdout',
    });
    await w.flushAll();
    await w.closeAll();

    const dir = path.join(baseDir, 'queue');
    const files = await readdir(dir);

    expect(files).toHaveLength(2);
    expect(files).toContain('a_b.jsonl');

    const suffixed = files.find(
      (f) => f.startsWith('a_b~') && f.endsWith('.jsonl'),
    );

    expect(suffixed).toBeDefined();
  });

  it('evicts LRU handle when maxOpenFiles is exceeded', async () => {
    const w = new KeyedJsonlWriter({
      maxOpenFiles: 2,
      runOutputBaseDirectory: await mkBase(),
    });

    w.appendRunChunk('q', '1', { data: 'a', timestamp: 't1', type: 'stdout' });
    w.appendRunChunk('q', '2', { data: 'b', timestamp: 't2', type: 'stdout' });
    w.appendRunChunk('q', '3', { data: 'c', timestamp: 't3', type: 'stdout' });
    w.appendRunChunk('q', '1', { data: 'd', timestamp: 't4', type: 'stdout' });
    await w.closeAll();

    const t1 = await readFile(path.join(baseDir, 'q/1.jsonl'), 'utf8');
    const lines = t1
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));

    expect(lines).toEqual([
      expect.objectContaining({ data: 'a' }),
      expect.objectContaining({ data: 'd' }),
    ]);
    await w.closeAll();
  });

  it('flush makes data visible before close', async () => {
    const w = new KeyedJsonlWriter({ runOutputBaseDirectory: await mkBase() });

    w.appendRunChunk('q', '7', { data: 'x', timestamp: 't', type: 'stdout' });
    await w.flush('q', '7');

    const mid = await readFile(path.join(baseDir, 'q/7.jsonl'), 'utf8');

    expect(mid.trim().length).toBeGreaterThan(0);
    await w.close('q', '7');
    await w.closeAll();
  });

  it('close is idempotent', async () => {
    const w = new KeyedJsonlWriter({ runOutputBaseDirectory: await mkBase() });

    w.appendRunChunk('q', 'z', { data: '1', timestamp: 't', type: 'meta' });
    await w.close('q', 'z');
    await w.close('q', 'z');
    await w.closeAll();
  });

  it('replaces invalid lone surrogate in raw mode with UTF-8 replacement', async () => {
    const w = new KeyedJsonlWriter({
      lineFormat: 'raw',
      runOutputBaseDirectory: await mkBase(),
    });

    w.appendRunChunk('q', '1', '\uD800\n');
    await w.close('q', '1');

    const buf = await readFile(path.join(baseDir, 'q/1.log'));

    expect(buf.toString('utf8')).toContain('\uFFFD');
  });
});
