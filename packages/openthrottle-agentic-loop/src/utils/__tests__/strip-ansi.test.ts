import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import type { SpawnCommand, ValidationChunk } from '../../contract/index.ts';
import { createCommandValidator } from '../create-command-validator.ts';
import { runCommandSequence } from '../run-command-sequence.ts';
import { spawnShellCommand } from '../spawn-shell-command.ts';
import { createAnsiStripStream, stripAnsi } from '../strip-ansi.ts';
import { systemScheduleClock } from '../system-schedule-clock.ts';
import { makeTask } from './loop-fakes.ts';

const ESC = String.fromCharCode(27);
const GREEN_CHECK = `${ESC}[32m✔${ESC}[39m`;

const scriptedSpawn = (pieces: readonly string[]): SpawnCommand => {
  return ({ onOutput }) => {
    pieces.forEach((piece) => {
      onOutput(piece);
    });

    return {
      done: Promise.resolve({ exitCode: 0 }),
      kill: () => undefined,
    };
  };
};

describe('stripAnsi', () => {
  it('removes color sequences and keeps the text', () => {
    expect(stripAnsi(`${GREEN_CHECK} ok`)).toBe('✔ ok');
  });
});

describe('createAnsiStripStream', () => {
  it('holds back an escape sequence split across pushes', () => {
    const emitted: string[] = [];
    const stream = createAnsiStripStream((text) => emitted.push(text));

    stream.push(`a${ESC}`);
    stream.push('[3');
    stream.push(`2mb${ESC}[39`);
    stream.push('mc');
    stream.flush();

    expect(emitted.join('')).toBe('abc');
    expect(emitted.join('')).not.toContain(ESC);
  });

  it('drops a dangling partial escape on flush', () => {
    const emitted: string[] = [];
    const stream = createAnsiStripStream((text) => emitted.push(text));

    stream.push(`x${ESC}[`);
    stream.flush();

    expect(emitted.join('')).toBe('x');
  });
});

describe('ANSI never reaches onChunk', () => {
  it('strips from validator output, including a split sequence', async () => {
    const chunks: ValidationChunk[] = [];
    const validator = createCommandValidator({
      clock: systemScheduleClock,
      commands: ['pnpm test'],
      cwd: '/wt',
      onChunk: (chunk) => chunks.push(chunk),
      spawn: scriptedSpawn([
        `${GREEN_CHECK} one\n${ESC}`,
        '[3',
        '1mred',
        `${ESC}[39m\n`,
      ]),
      timeoutMs: 60_000,
    });

    await validator.validate({
      signal: new AbortController().signal,
      task: makeTask('1'),
      taskStartSha: 'abc',
    });

    const text = chunks.map((chunk) => chunk.text).join('');

    expect(text).toContain('✔ one\nred\n');
    expect(text).not.toContain(ESC);
  });

  it('strips from runCommandSequence output (setup and final validation path)', async () => {
    const texts: string[] = [];

    await runCommandSequence({
      clock: systemScheduleClock,
      commands: ['setup'],
      cwd: '/wt',
      onOutput: ({ text }) => texts.push(text),
      signal: new AbortController().signal,
      spawn: scriptedSpawn([`${ESC}[1mbold${ESC}[22m\n`]),
      timeoutMs: 60_000,
    });

    expect(texts.join('')).toContain('bold\n');
    expect(texts.join('')).not.toContain(ESC);
  });
});

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
