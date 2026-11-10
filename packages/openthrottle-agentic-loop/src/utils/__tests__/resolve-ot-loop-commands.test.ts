import { describe, expect, it } from 'vitest';

import type { ResolverFs } from '../../contract/index.ts';
import { OT_LOOP_NEEDS_VALIDATION_MESSAGE } from '../../data/data.constants.ts';
import { resolveOtLoopCommands } from '../resolve-ot-loop-commands.ts';

const ROOT = '/wt';

const makeFs = (files: Record<string, string>): ResolverFs => {
  return {
    exists: (path) => Promise.resolve(path in files),
    readFile: (path) => Promise.resolve(files[path]),
  };
};

const resolve = (
  files: Record<string, string>,
  validationCommands: readonly string[] | undefined = undefined,
) => {
  return resolveOtLoopCommands({
    fs: makeFs(files),
    otLoop:
      validationCommands === undefined ? undefined : { validationCommands },
    worktreeRoot: ROOT,
  });
};

describe('resolveOtLoopCommands order', () => {
  it('prefers the plan override and keeps setup and final from the file', async () => {
    const result = await resolve(
      {
        '/wt/.openthrottle/ot-loop.json': JSON.stringify({
          finalValidation: { commands: ['final'] },
          setup: { commands: ['setup'] },
          validation: { commands: ['repo'] },
        }),
        '/wt/nx.json': '{}',
      },
      ['plan'],
    );

    expect(result).toEqual({
      finalValidation: ['final'],
      kind: 'resolved',
      setup: ['setup'],
      source: 'plan',
      validation: ['plan'],
    });
  });

  it('uses the committed file next', async () => {
    const result = await resolve({
      '/wt/.openthrottle/ot-loop.json': JSON.stringify({
        validation: { commands: ['a', 'b'] },
      }),
      '/wt/nx.json': '{}',
    });

    expect(result).toEqual({
      finalValidation: [],
      kind: 'resolved',
      setup: [],
      source: 'repo-file',
      validation: ['a', 'b'],
    });
  });

  it('falls back to the Nx default when only setup is configured', async () => {
    const result = await resolve({
      '/wt/.openthrottle/ot-loop.json': JSON.stringify({
        setup: { commands: ['s'] },
      }),
      '/wt/nx.json': '{}',
      '/wt/pnpm-lock.yaml': '',
    });

    expect(result).toMatchObject({ setup: ['s'], source: 'nx-default' });
  });

  it.each([
    ['pnpm-lock.yaml', 'pnpm'],
    ['package-lock.json', 'npx'],
    ['yarn.lock', 'yarn'],
  ])('picks the package manager from %s', async (lockfile, runner) => {
    const result = await resolve({
      '/wt/nx.json': '{}',
      [`/wt/${lockfile}`]: '',
    });

    expect(result).toMatchObject({
      source: 'nx-default',
      validation: [
        `${runner} nx affected -t lint --base={taskStartSha} --parallel=1`,
        `${runner} nx affected -t typecheck --base={taskStartSha} --parallel=1`,
        `${runner} nx affected -t test --base={taskStartSha} --parallel=1`,
      ],
    });
  });

  it('returns none without a file or nx.json', async () => {
    expect(await resolve({ '/wt/pnpm-lock.yaml': '' })).toEqual({
      kind: 'none',
      message: OT_LOOP_NEEDS_VALIDATION_MESSAGE,
    });
  });
});

describe('resolveOtLoopCommands malformed file', () => {
  it.each([
    ['not json', '{nope'],
    ['an array', '[]'],
    ['a string section', '{"validation":"x"}'],
    ['non-array commands', '{"validation":{"commands":"x"}}'],
    ['a non-string command', '{"setup":{"commands":[1]}}'],
    ['an empty command', '{"finalValidation":{"commands":[" "]}}'],
    ['empty validation commands', '{"validation":{"commands":[]}}'],
  ])('reports invalid for %s', async (_name, body) => {
    const result = await resolve({
      '/wt/.openthrottle/ot-loop.json': body,
      '/wt/nx.json': '{}',
    });

    expect(result.kind).toBe('invalid');
    expect(result).toMatchObject({
      message: expect.stringContaining('.openthrottle/ot-loop.json'),
    });
  });

  it('reports invalid when the file cannot be read', async () => {
    const result = await resolveOtLoopCommands({
      fs: {
        exists: () => Promise.resolve(false),
        readFile: () => Promise.reject(new Error('EACCES')),
      },
      otLoop: undefined,
      worktreeRoot: ROOT,
    });

    expect(result).toMatchObject({ kind: 'invalid' });
  });
});
