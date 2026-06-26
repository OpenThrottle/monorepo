import { Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProfileExecutionFileWriter } from './profile-execution-file-writer';
import { setProfileExecutionReporter } from './profile-execution.reporter';
import type { ProfileExecutionResult } from './profile-execution.types';
import { profileExecution } from './profile-execution.util';

describe('createProfileExecutionFileWriter', () => {
  let outputPath: string;

  beforeEach(() => {
    outputPath = path.join(
      os.tmpdir(),
      `profile-exec-${Date.now()}-${Math.random().toString(36).slice(2)}.ndjson`,
    );
  });

  afterEach(async () => {
    setProfileExecutionReporter(undefined);
    await fs.unlink(outputPath).catch(() => {});
  });

  it('appends NDJSON lines for each reported result', async () => {
    const writer = createProfileExecutionFileWriter({ outputPath });
    setProfileExecutionReporter(writer);
    await profileExecution('test-label', () => 42, { captureOutput: true });
    await profileExecution('second', async () => 'ok', { captureOutput: true });

    // Await the fire-and-forget write chain deterministically (no setTimeout race).
    await writer.drain();

    const content = await fs.readFile(outputPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);

    const first = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(first.label).toBe('test-label');
    expect(first.output).toBe(42);
    expect(first.durationMs).toBeGreaterThanOrEqual(0);

    const second = JSON.parse(lines[1]!) as Record<string, unknown>;
    expect(second.label).toBe('second');
    expect(second.output).toBe('ok');
  });

  it('creates file if it does not exist', async () => {
    const writer = createProfileExecutionFileWriter({ outputPath });
    setProfileExecutionReporter(writer);
    await profileExecution('create-test', () => null);

    await writer.drain();

    await expect(fs.access(outputPath)).resolves.toBeUndefined();
    const content = await fs.readFile(outputPath, 'utf8');
    expect(content).toContain('create-test');
  });

  it('truncates lines exceeding maxLineBytes', async () => {
    const writer = createProfileExecutionFileWriter({
      maxLineBytes: 64,
      outputPath,
    });
    setProfileExecutionReporter(writer);
    await profileExecution('big', () => 'x'.repeat(500), {
      captureOutput: true,
    });

    await writer.drain();

    const content = await fs.readFile(outputPath, 'utf8');
    const parsed = JSON.parse(content.trim()) as Record<string, unknown>;
    expect(parsed.truncated).toBe('[TRUNCATED:line-size]');
    expect(parsed.label).toBe('big');
    expect(parsed.output).toBeUndefined();
  });

  it('appends to existing file', async () => {
    await fs.writeFile(
      outputPath,
      JSON.stringify({ label: 'existing' }) + '\n',
      'utf8',
    );
    const writer = createProfileExecutionFileWriter({ outputPath });
    setProfileExecutionReporter(writer);
    await profileExecution('appended', () => true);

    await writer.drain();

    const content = await fs.readFile(outputPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).label).toBe('existing');
    expect(JSON.parse(lines[1]!).label).toBe('appended');
  });

  it('emits a fallback line instead of dropping a record that fails to serialize', async () => {
    const writer = createProfileExecutionFileWriter({ outputPath });

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result: ProfileExecutionResult = {
      durationMs: 1,
      endTime: 2,
      label: 'circular-output',
      output: circular,
      startTime: 1,
    };

    writer(result);
    await writer.drain();

    const content = await fs.readFile(outputPath, 'utf8');
    const parsed = JSON.parse(content.trim()) as Record<string, unknown>;
    expect(parsed.error).toBe('serialize_failed');
    expect(parsed.label).toBe('circular-output');
    expect(typeof parsed.reason).toBe('string');
  });

  it('emits a fallback line for a result that cannot be JSON-serialized (BigInt)', async () => {
    const writer = createProfileExecutionFileWriter({ outputPath });

    const result: ProfileExecutionResult = {
      durationMs: 1,
      endTime: 2,
      label: 'bigint-output',
      // JSON.stringify throws TypeError on BigInt; the writer must fall back rather
      // than reject the write chain and silently drop the record.
      output: { count: 10n },
      startTime: 1,
    };

    writer(result);
    await writer.drain();

    const content = await fs.readFile(outputPath, 'utf8');
    const parsed = JSON.parse(content.trim()) as Record<string, unknown>;
    expect(parsed.error).toBe('serialize_failed');
    expect(parsed.label).toBe('bigint-output');
    expect(typeof parsed.reason).toBe('string');
  });

  it('logs write failures via the Nest logger instead of swallowing them', async () => {
    const warnSpy = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});

    // A directory path that does not exist forces appendFile to reject.
    const badPath = path.join(
      os.tmpdir(),
      `nonexistent-dir-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      'out.ndjson',
    );
    const writer = createProfileExecutionFileWriter({ outputPath: badPath });

    writer({
      durationMs: 1,
      endTime: 2,
      label: 'write-fail',
      startTime: 1,
    });
    await writer.drain();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toContain(badPath);

    warnSpy.mockRestore();
  });

  it('rate-limits repeated write-failure logs and reports suppressed count', async () => {
    const warnSpy = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});

    const badPath = path.join(
      os.tmpdir(),
      `nonexistent-dir-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      'out.ndjson',
    );
    const writer = createProfileExecutionFileWriter({ outputPath: badPath });

    for (let i = 0; i < 5; i += 1) {
      writer({ durationMs: 1, endTime: 2, label: `fail-${i}`, startTime: 1 });
    }
    await writer.drain();

    // Within the throttle window only the first failure logs; the rest are suppressed.
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  const makeResult = (label: string): ProfileExecutionResult => ({
    durationMs: 1,
    endTime: 2,
    label,
    startTime: 1,
  });

  it('drops results that miss the sample rate (sampleRate 0 records nothing)', async () => {
    const writer = createProfileExecutionFileWriter({
      outputPath,
      sampleRate: 0,
    });

    for (let i = 0; i < 20; i += 1) {
      writer(makeResult(`drop-${i}`));
    }
    await writer.drain();

    await expect(fs.access(outputPath)).rejects.toThrow();
  });

  it('records every result when sampleRate is 1', async () => {
    const writer = createProfileExecutionFileWriter({
      outputPath,
      sampleRate: 1,
    });

    for (let i = 0; i < 5; i += 1) {
      writer(makeResult(`keep-${i}`));
    }
    await writer.drain();

    const content = await fs.readFile(outputPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(5);
  });

  it('samples deterministically against a stubbed Math.random', async () => {
    // sampleRate 0.5 keeps results where Math.random() < 0.5.
    const randomSpy = vi
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // keep
      .mockReturnValueOnce(0.9) // drop
      .mockReturnValueOnce(0.49) // keep
      .mockReturnValueOnce(0.5); // drop
    const writer = createProfileExecutionFileWriter({
      outputPath,
      sampleRate: 0.5,
    });

    writer(makeResult('keep-a'));
    writer(makeResult('drop-a'));
    writer(makeResult('keep-b'));
    writer(makeResult('drop-b'));
    await writer.drain();

    const content = await fs.readFile(outputPath, 'utf8');
    const labels = content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => (JSON.parse(line) as Record<string, unknown>).label);
    expect(labels).toEqual(['keep-a', 'keep-b']);

    randomSpy.mockRestore();
  });

  it('rotates the file to <outputPath>.1 when maxFileBytes would be exceeded', async () => {
    const rotated = `${outputPath}.1`;
    // Each NDJSON line is well over 20 bytes, so the second append triggers rotation.
    const writer = createProfileExecutionFileWriter({
      maxFileBytes: 20,
      outputPath,
    });

    writer(makeResult('first'));
    await writer.drain();
    writer(makeResult('second'));
    await writer.drain();

    try {
      const liveContent = await fs.readFile(outputPath, 'utf8');
      const rotatedContent = await fs.readFile(rotated, 'utf8');

      expect(JSON.parse(rotatedContent.trim()).label).toBe('first');
      expect(JSON.parse(liveContent.trim()).label).toBe('second');
    } finally {
      await fs.unlink(rotated).catch(() => {});
    }
  });

  it('buffers lines and only flushes once maxBufferedLines is reached', async () => {
    const writer = createProfileExecutionFileWriter({
      maxBufferedLines: 3,
      outputPath,
    });

    writer(makeResult('b1'));
    writer(makeResult('b2'));

    // Buffer not yet full — nothing should have flushed, so no write chain exists
    // yet and the file must be absent.
    await expect(fs.access(outputPath)).rejects.toThrow();

    writer(makeResult('b3'));
    await writer.drain();

    // The third result fills the buffer, flushing all three lines together.
    const content = await fs.readFile(outputPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines.map((l) => JSON.parse(l).label)).toEqual(['b1', 'b2', 'b3']);
  });

  it('flushes a partially-filled buffer after flushIntervalMs', async () => {
    const writer = createProfileExecutionFileWriter({
      flushIntervalMs: 20,
      maxBufferedLines: 100,
      outputPath,
    });

    writer(makeResult('timed'));
    // Wait past the flush interval so the timer fires the flush, then drain to await
    // the resulting append deterministically (no racing the write itself).
    await new Promise((r) => setTimeout(r, 40));
    await writer.drain();

    const content = await fs.readFile(outputPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!).label).toBe('timed');
  });
});
