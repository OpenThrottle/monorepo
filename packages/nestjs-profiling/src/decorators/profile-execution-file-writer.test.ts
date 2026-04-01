import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createProfileExecutionFileWriter } from './profile-execution-file-writer';
import { setProfileExecutionReporter } from './profile-execution.reporter';
import { profileExecution } from './profile-execution.util';

describe('createProfileExecutionFileWriter', () => {
  let outputPath: string;

  beforeEach(() => {
    outputPath = path.join(os.tmpdir(), `profile-exec-${Date.now()}-${Math.random().toString(36).slice(2)}.ndjson`);
  });

  afterEach(async () => {
    setProfileExecutionReporter(undefined);
    await fs.unlink(outputPath).catch(() => {});
  });

  it('appends NDJSON lines for each reported result', async () => {
    setProfileExecutionReporter(
      createProfileExecutionFileWriter({ outputPath }),
    );
    await profileExecution('test-label', () => 42);
    await profileExecution('second', async () => 'ok');

    // Allow async writes to complete
    await new Promise((r) => setTimeout(r, 50));

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
    setProfileExecutionReporter(
      createProfileExecutionFileWriter({ outputPath }),
    );
    await profileExecution('create-test', () => null);

    await new Promise((r) => setTimeout(r, 50));

    await expect(fs.access(outputPath)).resolves.toBeUndefined();
    const content = await fs.readFile(outputPath, 'utf8');
    expect(content).toContain('create-test');
  });

  it('appends to existing file', async () => {
    await fs.writeFile(outputPath, JSON.stringify({ label: 'existing' }) + '\n', 'utf8');
    setProfileExecutionReporter(
      createProfileExecutionFileWriter({ outputPath }),
    );
    await profileExecution('appended', () => true);

    await new Promise((r) => setTimeout(r, 50));

    const content = await fs.readFile(outputPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).label).toBe('existing');
    expect(JSON.parse(lines[1]!).label).toBe('appended');
  });
});
