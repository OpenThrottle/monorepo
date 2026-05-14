/**
 * @description Integration tests for `--backend` in {@link parseRalphArgs} (uses partial mock of seed merge).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../ralph-runtime-config', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../ralph-runtime-config')>();
  return {
    ...actual,
    mergeRalphRuntimeSeed: vi.fn(() => ({
      backend: 'cursor',
      iterationTimeoutMs: undefined,
      iterations: 10,
      model: 'auto',
      project: undefined,
      prompt: '/agents/ralph',
      promptFile: undefined,
    })),
  };
});

const PLAN_UUID = '77cb14a0-5eb0-4061-87ea-d618b85e8818';

describe('parseRalphArgs (execution backend)', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    delete process.env.WORKFLOW_RALPH_DEBUG;
    delete process.env.RALPH_DEBUG;
    delete process.env.WORKFLOW_RALPH_VERBOSE;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it('parses --backend cursor', async () => {
    process.argv = [
      'node',
      'ralph.js',
      '--plan',
      PLAN_UUID,
      '--backend',
      'cursor',
    ];
    const { parseRalphArgs } = await import('../parsers');
    const args = parseRalphArgs();
    expect(args.backend).toBe('cursor');
  });

  it('parses --backend claude (case-insensitive)', async () => {
    process.argv = [
      'node',
      'ralph.js',
      '--plan',
      PLAN_UUID,
      '--backend',
      'Claude',
    ];
    const { parseRalphArgs } = await import('../parsers');
    const args = parseRalphArgs();
    expect(args.backend).toBe('claude');
  });

  it('throws on unknown --backend', async () => {
    process.argv = [
      'node',
      'ralph.js',
      '--plan',
      PLAN_UUID,
      '--backend',
      'not-a-runner',
    ];
    const { parseRalphArgs } = await import('../parsers');
    expect(() => parseRalphArgs()).toThrow(/Unknown execution backend/);
  });
});
