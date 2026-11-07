import { describe, expect, it, vi } from 'vitest';

import type { PullRequestLookup, PullRequestState } from '../../../index.ts';
import {
  decideClaudeBashGuard,
  readClaudeBashCall,
  renderClaudeBashGuard,
} from '../bash-guard-output.ts';

/** Portability rules off, so these tests exercise only the stale-PR rule. */
const INERT_SHELL = {
  globMatches: async (): Promise<boolean> => true,
  platform: 'linux',
  shell: null,
} as const;

const bashPayload = (command: string, cwd: string | null = '/repo') => {
  return {
    ...(cwd === null ? {} : { cwd }),
    hook_event_name: 'PreToolUse',
    session_id: 'session-1',
    tool_input: { command, description: 'x' },
    tool_name: 'Bash',
  };
};

const lookupReturning = (state: PullRequestState) => {
  return vi.fn<PullRequestLookup>(async () => state);
};

const MERGED: PullRequestState = {
  changedAt: '2026-11-05T18:22:41Z',
  kind: 'found',
  number: 661,
  state: 'MERGED',
};

describe('readClaudeBashCall', () => {
  it('reads the command and cwd of a Bash call', () => {
    expect(readClaudeBashCall(bashPayload('ls'))).toEqual({
      background: false,
      command: 'ls',
      cwd: '/repo',
    });
  });

  it('ignores other tools', () => {
    expect(
      readClaudeBashCall({ tool_input: { command: 'ls' }, tool_name: 'Read' }),
    ).toBeNull();
  });
});

describe('renderClaudeBashGuard', () => {
  it('prints nothing for an allow', () => {
    expect(renderClaudeBashGuard({ decision: 'allow' })).toBeNull();
  });

  it('renders a deny as a PreToolUse permission decision', () => {
    const out = renderClaudeBashGuard({
      decision: 'deny',
      findings: [{ reason: 'no', ruleId: 'r' }],
    });
    expect(JSON.parse(out ?? '')).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: '[bash-guard:r] no',
      },
    });
  });

  it('renders a warn as additional context, without a decision', () => {
    const out = renderClaudeBashGuard({
      decision: 'warn',
      findings: [{ reason: 'careful', ruleId: 'r' }],
    });
    expect(JSON.parse(out ?? '')).toEqual({
      hookSpecificOutput: {
        additionalContext: '[bash-guard:r] careful',
        hookEventName: 'PreToolUse',
      },
    });
  });
});

describe('decideClaudeBashGuard', () => {
  it("denies f5d9515c's command on a merged PR", async () => {
    const lookupPullRequest = lookupReturning(MERGED);
    const out = await decideClaudeBashGuard(
      bashPayload(
        'gh pr view 661 --json headRefName,state && gh pr comment 661 --body hi',
      ),
      '/fallback',
      { lookupPullRequest, lookupTimeoutMs: 3000, ...INERT_SHELL },
    );
    expect(out).toContain('"permissionDecision":"deny"');
    expect(out).toContain('MERGED');
    expect(lookupPullRequest).toHaveBeenCalledWith({
      cwd: '/repo',
      repo: null,
      selector: '661',
    });
  });

  it('never looks anything up for a command that is not a gh pr write', async () => {
    const lookupPullRequest = lookupReturning(MERGED);
    const out = await decideClaudeBashGuard(
      bashPayload('pnpm nx run foo:test && git status'),
      '/fallback',
      { lookupPullRequest, lookupTimeoutMs: 3000, ...INERT_SHELL },
    );
    expect(out).toBeNull();
    expect(lookupPullRequest).not.toHaveBeenCalled();
  });

  it('falls back to the given directory when the payload has none', async () => {
    const lookupPullRequest = lookupReturning(MERGED);
    await decideClaudeBashGuard(
      bashPayload('gh pr merge --squash', null),
      '/fallback',
      { lookupPullRequest, lookupTimeoutMs: 3000, ...INERT_SHELL },
    );
    expect(lookupPullRequest).toHaveBeenCalledWith({
      cwd: '/fallback',
      repo: null,
      selector: null,
    });
  });
});

describe('decideClaudeBashGuard with run_in_background', () => {
  const masked = 'pnpm run check:local; echo exit=$?';
  const context = {
    lookupPullRequest: lookupReturning({ kind: 'unknown' }),
    lookupTimeoutMs: 3000,
    ...INERT_SHELL,
  };

  it('denies a masked exit when the call runs in the background', async () => {
    const payload = bashPayload(masked);
    const raw = {
      ...payload,
      tool_input: { ...payload.tool_input, run_in_background: true },
    };
    const out = await decideClaudeBashGuard(raw, '/fallback', context);
    expect(JSON.parse(out ?? '')).toMatchObject({
      hookSpecificOutput: { permissionDecision: 'deny' },
    });
  });

  it('only warns on the same command in the foreground', async () => {
    const out = await decideClaudeBashGuard(
      bashPayload(masked),
      '/fallback',
      context,
    );
    const parsed: unknown = JSON.parse(out ?? '');
    expect(parsed).toMatchObject({
      hookSpecificOutput: {
        additionalContext: expect.stringContaining('masked-exit-trailing'),
      },
    });
    expect(JSON.stringify(parsed)).not.toContain('permissionDecision');
  });
});
