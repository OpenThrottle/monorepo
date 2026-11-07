import { describe, expect, it, vi } from 'vitest';

import { evaluateBashGuard, formatBashGuardFindings } from '../registry.ts';
import type { BashGuardContext, BashGuardRule } from '../types.ts';

const CONTEXT: BashGuardContext = {
  background: false,
  cwd: '/repo',
  lookupPullRequest: vi.fn(async () => ({ kind: 'unknown' as const })),
  lookupTimeoutMs: 100,
};

const ruleAnswering = (
  id: string,
  verdict: Awaited<ReturnType<BashGuardRule['evaluate']>>,
): BashGuardRule => {
  return { evaluate: async () => verdict, id };
};

describe('evaluateBashGuard', () => {
  it('allows when every rule allows', async () => {
    const rules = [ruleAnswering('a', { decision: 'allow' })];
    expect(await evaluateBashGuard('ls', CONTEXT, rules)).toEqual({
      decision: 'allow',
    });
  });

  it('lets a deny win over a warn, keeping only the denies', async () => {
    const rules = [
      ruleAnswering('w', { decision: 'warn', reason: 'careful' }),
      ruleAnswering('d', { decision: 'deny', reason: 'no' }),
    ];
    expect(await evaluateBashGuard('ls', CONTEXT, rules)).toEqual({
      decision: 'deny',
      findings: [{ reason: 'no', ruleId: 'd' }],
    });
  });

  it('warns when the only findings are warns', async () => {
    const rules = [ruleAnswering('w', { decision: 'warn', reason: 'careful' })];
    expect(await evaluateBashGuard('ls', CONTEXT, rules)).toEqual({
      decision: 'warn',
      findings: [{ reason: 'careful', ruleId: 'w' }],
    });
  });

  it('treats a rule that throws as an allow', async () => {
    const throwing: BashGuardRule = {
      evaluate: async () => {
        throw new Error('boom');
      },
      id: 'x',
    };
    expect(await evaluateBashGuard('ls', CONTEXT, [throwing])).toEqual({
      decision: 'allow',
    });
  });

  it('allows an empty command without running any rule', async () => {
    const evaluate = vi.fn(async () => ({ decision: 'allow' as const }));
    await evaluateBashGuard('  ', CONTEXT, [{ evaluate, id: 'a' }]);
    expect(evaluate).not.toHaveBeenCalled();
  });
});

describe('formatBashGuardFindings', () => {
  it('prefixes each reason with its rule id', () => {
    expect(
      formatBashGuardFindings([
        { reason: 'one', ruleId: 'a' },
        { reason: 'two', ruleId: 'b' },
      ]),
    ).toBe('[bash-guard:a] one\n[bash-guard:b] two');
  });
});
