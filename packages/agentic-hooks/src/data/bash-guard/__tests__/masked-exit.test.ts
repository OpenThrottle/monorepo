import { describe, expect, it, vi } from 'vitest';

import {
  MASKED_EXIT_PIPELINE_RULE_ID,
  MASKED_EXIT_TRAILING_RULE_ID,
  maskedExitPipelineRule,
  maskedExitTrailingRule,
} from '../masked-exit.ts';
import { evaluateBashGuard } from '../registry.ts';
import { parseBashCommand } from '../shell-words.ts';
import type { BashGuardContext, BashGuardRule } from '../types.ts';

const contextFor = (background: boolean): BashGuardContext => {
  return {
    background,
    cwd: '/repo',
    lookupPullRequest: vi.fn(async () => ({ kind: 'unknown' as const })),
    lookupTimeoutMs: 100,
  };
};

const decide = async (
  rule: BashGuardRule,
  command: string,
  background = false,
): Promise<string> => {
  const verdict = await rule.evaluate(
    parseBashCommand(command, '/repo'),
    contextFor(background),
  );
  return verdict.decision;
};

// e1d95091 #13: a background check:local whose trailing echo made the harness
// report exit 0 while nx had been killed with 130.
const E1D95091_BACKGROUND_CHECK = `cd /repo && pnpm run check:local 2>&1 | tail -40; echo exit=$?`;

// 8f40c964 #24 and 215ce37e #11: the per-task commit wrapper.
const COMMIT_WRAPPERS = [
  `git add -A && git commit -q -m "$(cat <<'EOF'\nfeat(x): y\n\nPlan-Id: p\nTask-Id: t\nEOF\n)"; echo "exit=$?"`,
  'git add packages/x && git commit -m "fix(x): y" -m "Task-Id: t"; echo exit=$?',
];

describe('masked-exit-trailing', () => {
  describe('when the command runs in the background', () => {
    it("denies e1d95091's check:local wrapper", async () => {
      expect(
        await decide(maskedExitTrailingRule, E1D95091_BACKGROUND_CHECK, true),
      ).toBe('deny');
    });

    it('only warns on a trailing `|| true` and `; true`', async () => {
      // Replay false positive: a background launch-and-probe script.
      const probe = `pnpm dev > log 2>&1 &\ngrep -oE nonce log | head -3 || true`;
      expect(await decide(maskedExitTrailingRule, probe, true)).toBe('warn');
      expect(
        await decide(maskedExitTrailingRule, 'pnpm nx run x:test; true', true),
      ).toBe('warn');
    });
  });

  describe('when the command runs in the foreground', () => {
    it.each(COMMIT_WRAPPERS)(
      'warns on the commit wrapper %#',
      async (command) => {
        expect(await decide(maskedExitTrailingRule, command)).toBe('warn');
      },
    );

    it('warns on printf and ${?} spellings and on `|| :`', async () => {
      expect(
        await decide(maskedExitTrailingRule, 'make; printf "%d" ${?}'),
      ).toBe('warn');
      expect(await decide(maskedExitTrailingRule, 'make || :')).toBe('warn');
    });
  });

  describe('when the status survives', () => {
    it.each([
      'pnpm nx run x:test; rc=$?; echo exit=$rc; exit $rc',
      'pnpm nx run x:test && echo exit=$?',
      'echo $?',
      'pnpm nx run x:test',
      'grep -c foo file || true && echo done',
      'echo "status $?" > /dev/null; ls',
    ])('allows %s', async (command) => {
      expect(await decide(maskedExitTrailingRule, command, true)).toBe('allow');
    });
  });
});

describe('masked-exit-pipeline', () => {
  it('warns when a validation is piped into tail without pipefail', async () => {
    expect(
      await decide(
        maskedExitPipelineRule,
        'pnpm nx run x:test 2>&1 | tail -20',
      ),
    ).toBe('warn');
  });

  it.each([
    'npx vitest run | grep -E "passed|failed"',
    'cd /repo && pnpm exec tsc -b 2>&1 | head',
    'pnpm check:local | tee log | tail -5',
    'pnpm nx run x:test |& grep FAIL',
  ])('warns on %s', async (command) => {
    expect(await decide(maskedExitPipelineRule, command)).toBe('warn');
  });

  it.each([
    'set -o pipefail; pnpm nx run x:test 2>&1 | tail -20',
    'set -euo pipefail\npnpm nx run x:test | tail',
    'setopt pipefail; pnpm nx run x:test | tail',
    'git log --oneline | head -5',
    'pnpm nx run x:test 2>&1 > out.log; tail out.log',
    'pnpm nx run x:test | tee out.log',
  ])('allows %s', async (command) => {
    expect(await decide(maskedExitPipelineRule, command)).toBe('allow');
  });

  it('still warns when pipefail is only set after the pipeline', async () => {
    expect(
      await decide(
        maskedExitPipelineRule,
        'pnpm nx run x:test | tail; set -o pipefail',
      ),
    ).toBe('warn');
  });
});

describe('the registry', () => {
  it('runs both rules, and a background deny wins', async () => {
    const result = await evaluateBashGuard(
      E1D95091_BACKGROUND_CHECK,
      contextFor(true),
    );
    expect(result).toMatchObject({
      decision: 'deny',
      findings: [{ ruleId: MASKED_EXIT_TRAILING_RULE_ID }],
    });
  });

  it('reports both findings as warns in the foreground', async () => {
    const result = await evaluateBashGuard(
      E1D95091_BACKGROUND_CHECK,
      contextFor(false),
    );
    expect(result).toMatchObject({
      decision: 'warn',
      findings: [
        { ruleId: MASKED_EXIT_PIPELINE_RULE_ID },
        { ruleId: MASKED_EXIT_TRAILING_RULE_ID },
      ],
    });
  });

  it('suggests keeping the status with `exit $rc`', async () => {
    const result = await evaluateBashGuard(
      E1D95091_BACKGROUND_CHECK,
      contextFor(true),
    );
    expect(JSON.stringify(result)).toContain('exit $rc');
  });
});
