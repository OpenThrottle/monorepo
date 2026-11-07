import { describe, expect, it, vi } from 'vitest';

import { evaluateBashGuard } from '../registry.ts';
import { parseGhPrWrite, stalePrWriteRule } from '../stale-pr-write.ts';
import type {
  BashGuardContext,
  PullRequestQuery,
  PullRequestState,
} from '../types.ts';

const CWD = '/repo';

/** The exact command from trajectory f5d9515c, step 12. */
const F5D9515C_COMMAND = `gh pr view 661 --json headRefName,state && gh pr comment 661 --body "Follow-up filed as an OT plan."`;

const MERGED_661: PullRequestState = {
  changedAt: '2026-11-05T18:22:41Z',
  kind: 'found',
  number: 661,
  state: 'MERGED',
};

const OPEN_661: PullRequestState = {
  changedAt: null,
  kind: 'found',
  number: 661,
  state: 'OPEN',
};

const contextWith = (
  lookup: (query: PullRequestQuery) => Promise<PullRequestState>,
  lookupTimeoutMs = 3000,
): BashGuardContext => {
  return {
    background: false,
    cwd: CWD,
    lookupPullRequest: vi.fn(lookup),
    lookupTimeoutMs,
  };
};

const returning = (state: PullRequestState): BashGuardContext => {
  return contextWith(async () => state);
};

const evaluate = (command: string, context: BashGuardContext) => {
  return evaluateBashGuard(command, context, [stalePrWriteRule]);
};

describe('parseGhPrWrite', () => {
  it('reads a numeric selector past value flags', () => {
    expect(
      parseGhPrWrite(['gh', 'pr', 'comment', '--body', 'x y', '661']),
    ).toEqual({
      kind: 'write',
      repo: null,
      selector: '661',
      subcommand: 'comment',
    });
  });

  it('reads -R / --repo / GH_REPO as the repository', () => {
    expect(
      parseGhPrWrite(['gh', 'pr', 'merge', '12', '-R', 'o/r', '--squash']),
    ).toMatchObject({ repo: 'o/r', selector: '12' });
    expect(
      parseGhPrWrite(['gh', 'pr', 'close', '--repo=o/r', '12']),
    ).toMatchObject({ repo: 'o/r', selector: '12' });
    expect(
      parseGhPrWrite(['GH_REPO=o/r', 'gh', 'pr', 'ready', '12']),
    ).toMatchObject({ repo: 'o/r', selector: '12' });
  });

  it('reads no selector as the current branch', () => {
    expect(parseGhPrWrite(['gh', 'pr', 'merge', '--squash'])).toMatchObject({
      kind: 'write',
      selector: null,
    });
  });

  it('distinguishes -c on close (a value) from -c on review (a flag)', () => {
    expect(
      parseGhPrWrite(['gh', 'pr', 'close', '-c', 'bye', '7']),
    ).toMatchObject({ selector: '7' });
    expect(parseGhPrWrite(['gh', 'pr', 'review', '-c', '7'])).toMatchObject({
      selector: '7',
    });
  });

  it.each([
    ['reopen', ['gh', 'pr', 'reopen', '661']],
    ['view', ['gh', 'pr', 'view', '661']],
    ['list', ['gh', 'pr', 'list']],
    ['checks', ['gh', 'pr', 'checks', '661']],
    ['help', ['gh', 'pr', 'merge', '--help']],
    ['not gh', ['git', 'pr', 'merge']],
  ])('ignores %s', (_label, words) => {
    expect(parseGhPrWrite(words)).toEqual({ kind: 'none' });
  });

  it.each([
    ['an unknown flag', ['gh', 'pr', 'merge', '--frobnicate', '12']],
    ['two positionals', ['gh', 'pr', 'comment', '12', '13']],
    ['a variable selector', ['gh', 'pr', 'comment', '$PR']],
  ])('refuses to guess on %s', (_label, words) => {
    expect(parseGhPrWrite(words)).toEqual({ kind: 'unparseable' });
  });
});

describe('stale-pr-write', () => {
  describe('when the PR is MERGED', () => {
    it("denies f5d9515c's command, naming the PR, its state and when", async () => {
      const result = await evaluate(F5D9515C_COMMAND, returning(MERGED_661));
      expect(result.decision).toBe('deny');
      if (result.decision !== 'deny') return;
      expect(result.findings[0]?.ruleId).toBe('stale-pr-write');
      expect(result.findings[0]?.reason).toContain('PR #661');
      expect(result.findings[0]?.reason).toContain('MERGED');
      expect(result.findings[0]?.reason).toContain('2026-11-05T18:22:41Z');
    });

    it('looks up only the write, not the read-only view before it', async () => {
      const context = returning(MERGED_661);
      await evaluate(F5D9515C_COMMAND, context);
      expect(context.lookupPullRequest).toHaveBeenCalledTimes(1);
      expect(context.lookupPullRequest).toHaveBeenCalledWith({
        cwd: CWD,
        repo: null,
        selector: '661',
      });
    });
  });

  describe('when the PR is CLOSED', () => {
    it('denies a merge', async () => {
      const result = await evaluate(
        'gh pr merge 9 --squash',
        returning({
          changedAt: null,
          kind: 'found',
          number: 9,
          state: 'CLOSED',
        }),
      );
      expect(result.decision).toBe('deny');
    });
  });

  describe('when the PR is OPEN', () => {
    it("allows f5d9515c's command", async () => {
      const result = await evaluate(F5D9515C_COMMAND, returning(OPEN_661));
      expect(result).toEqual({ decision: 'allow' });
    });
  });

  describe('selectors', () => {
    it('passes a URL selector through to the lookup', async () => {
      const url = 'https://github.com/o/r/pull/661';
      const context = returning(MERGED_661);
      const result = await evaluate(`gh pr comment ${url} -b hi`, context);
      expect(result.decision).toBe('deny');
      expect(context.lookupPullRequest).toHaveBeenCalledWith({
        cwd: CWD,
        repo: null,
        selector: url,
      });
    });

    it('passes a branch selector through to the lookup', async () => {
      const context = returning(MERGED_661);
      const result = await evaluate('gh pr edit feat/x --title t', context);
      expect(result.decision).toBe('deny');
      expect(context.lookupPullRequest).toHaveBeenCalledWith({
        cwd: CWD,
        repo: null,
        selector: 'feat/x',
      });
    });

    it("resolves no selector as the current branch's PR, in the cd'd directory", async () => {
      const context = returning(MERGED_661);
      const result = await evaluate('cd pkg && gh pr ready', context);
      expect(result.decision).toBe('deny');
      expect(context.lookupPullRequest).toHaveBeenCalledWith({
        cwd: '/repo/pkg',
        repo: null,
        selector: null,
      });
    });
  });

  describe('commands it never guards', () => {
    it.each([
      'gh pr reopen 661',
      'gh pr view 661 --json state',
      'gh pr list --state merged',
      'git status && ls',
      'echo "gh pr comment 661"',
    ])('allows %s without a lookup', async (command) => {
      const context = returning(MERGED_661);
      expect(await evaluate(command, context)).toEqual({ decision: 'allow' });
      expect(context.lookupPullRequest).not.toHaveBeenCalled();
    });

    it('allows when the directory cannot be known', async () => {
      const context = returning(MERGED_661);
      const result = await evaluate('cd "$D" && gh pr merge 661', context);
      expect(result).toEqual({ decision: 'allow' });
      expect(context.lookupPullRequest).not.toHaveBeenCalled();
    });
  });

  describe('fail-open', () => {
    it('allows when the lookup throws', async () => {
      const context = contextWith(async () => {
        throw new Error('gh: not logged in');
      });
      expect(await evaluate(F5D9515C_COMMAND, context)).toEqual({
        decision: 'allow',
      });
    });

    it('allows when the lookup times out', async () => {
      const context = contextWith(
        () => new Promise<PullRequestState>(() => undefined),
        10,
      );
      expect(await evaluate(F5D9515C_COMMAND, context)).toEqual({
        decision: 'allow',
      });
    });

    it('allows when the lookup returns unknown', async () => {
      const result = await evaluate(
        F5D9515C_COMMAND,
        returning({ kind: 'unknown' }),
      );
      expect(result).toEqual({ decision: 'allow' });
    });
  });
});
