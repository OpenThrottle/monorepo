import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { spawnShellCommand } from '../shell-command.ts';

describe('spawnShellCommand env', () => {
  it('sets NO_COLOR=1 and FORCE_COLOR=0 and keeps PATH', async () => {
    let output = '';
    const child = spawnShellCommand({
      command: `node -e "process.stdout.write([process.env.NO_COLOR, process.env.FORCE_COLOR, process.env.PATH === undefined ? 'nopath' : 'path'].join(','))"`,
      cwd: tmpdir(),
      onOutput: (text) => {
        output += text;
      },
    });

    await child.done;

    expect(output).toContain('1,0,path');
  });
});
