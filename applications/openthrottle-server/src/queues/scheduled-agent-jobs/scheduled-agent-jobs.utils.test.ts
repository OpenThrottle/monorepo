import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  describePermissionDenials,
  isDirectory,
  parsePermissionDenials,
} from './scheduled-agent-jobs.utils.ts';

/** @description A claude stream-json `result` line carrying the given `permission_denials`. */
const resultLine = (denials: readonly unknown[]): string => {
  return JSON.stringify({
    is_error: false,
    permission_denials: denials,
    subtype: 'success',
    type: 'result',
  });
};

/** @description One refused Bash call as claude reports it. */
const bashDenial = (id: string, command: string): Record<string, unknown> => {
  return {
    tool_input: { command, description: 'run it' },
    tool_name: 'Bash',
    tool_use_id: id,
  };
};

describe('parsePermissionDenials', () => {
  it('returns the refused calls from the result event', () => {
    const output = [
      JSON.stringify({ subtype: 'init', type: 'system' }),
      resultLine([bashDenial('t1', 'gh api user'), bashDenial('t2', 'curl x')]),
    ].join('\n');

    expect(parsePermissionDenials(output)).toEqual([
      { command: 'gh api user', toolName: 'Bash', toolUseId: 't1' },
      { command: 'curl x', toolName: 'Bash', toolUseId: 't2' },
    ]);
  });

  it('keeps a non-shell tool with no command', () => {
    const output = resultLine([
      {
        tool_input: { url: 'https://x' },
        tool_name: 'WebFetch',
        tool_use_id: 't1',
      },
    ]);

    expect(parsePermissionDenials(output)).toEqual([
      { command: null, toolName: 'WebFetch', toolUseId: 't1' },
    ]);
  });

  it('drops a call reported by more than one result event', () => {
    const line = resultLine([bashDenial('t1', 'gh api user')]);

    expect(parsePermissionDenials(`${line}\n${line}`)).toHaveLength(1);
  });

  describe('when nothing was refused', () => {
    it('returns none for an empty list, other events, or plain text', () => {
      const output = [
        resultLine([]),
        JSON.stringify({
          permission_denials: [bashDenial('t1', 'x')],
          type: 'user',
        }),
        'permission_denials in prose',
        '{"permission_denials": [not json',
      ].join('\n');

      expect(parsePermissionDenials(output)).toEqual([]);
    });

    it('skips malformed entries', () => {
      const output = resultLine([null, 'Bash', { tool_input: {} }]);

      expect(parsePermissionDenials(output)).toEqual([]);
    });
  });
});

describe('describePermissionDenials', () => {
  it('names a single refused call and the fix', () => {
    const message = describePermissionDenials([
      { command: 'gh api user', toolName: 'Bash', toolUseId: 't1' },
    ]);

    expect(message).toContain('1 tool call ');
    expect(message).toContain('Bash: gh api user');
    expect(message).toContain('allowed commands');
  });

  it('lists the first three and counts the rest', () => {
    const denials = ['a', 'b', 'c', 'd', 'e'].map((command) => {
      return { command, toolName: 'Bash', toolUseId: command };
    });

    const message = describePermissionDenials(denials);

    expect(message).toContain('5 tool calls');
    expect(message).toContain('Bash: c; and 2 more');
    expect(message).not.toContain('Bash: d');
  });

  it('shortens a long command', () => {
    const message = describePermissionDenials([
      { command: 'x'.repeat(200), toolName: 'Bash', toolUseId: 't1' },
    ]);

    expect(message).toContain(`${'x'.repeat(79)}…`);
    expect(message).not.toContain('x'.repeat(80));
  });
});

describe('isDirectory', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'is-directory-'));
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('is true for a directory', async () => {
    await expect(isDirectory(dir)).resolves.toBe(true);
  });

  it('is false for a file', async () => {
    const file = join(dir, 'a.txt');
    await writeFile(file, 'x');

    await expect(isDirectory(file)).resolves.toBe(false);
  });

  it('is false for a missing path', async () => {
    await expect(isDirectory(join(dir, 'missing'))).resolves.toBe(false);
  });
});
