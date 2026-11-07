/**
 * The Cursor bash-guard adapter maps a `beforeShellExecution` payload onto the
 * shared rule registry and renders the verdict in Cursor's permission schema.
 *
 * `./fixtures/before-shell-execution.json` is COMPOSED, not captured: its
 * envelope is copied from the captured `pre-tool-use-shell.json` (same
 * `cursor-agent 2026.09.10-fd3934a` probe, including the empty `cwd` the probe
 * saw on Shell events), and its event fields (`command`, `cwd`, `sandbox`)
 * follow Cursor's hooks reference. Replace it with a verbatim capture when one
 * is taken (see docs/monorepo/cursor-agent-hook-probe.md for the method).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isRecord } from '@openthrottle/nodejs-utils';
import { describe, expect, it, vi } from 'vitest';

import type { PullRequestLookup, PullRequestState } from '../../../index.ts';
import {
  CURSOR_SHELL_ALLOW,
  decideCursorBashGuard,
  readCursorShellCall,
  renderCursorBashGuard,
} from '../bash-guard-output.ts';

/** Portability rules off, so these tests exercise only the stale-PR rule. */
const INERT_SHELL = {
  globMatches: async (): Promise<boolean> => true,
  platform: 'linux',
  shell: null,
} as const;

const fixture: unknown = JSON.parse(
  fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      'fixtures',
      'before-shell-execution.json',
    ),
    'utf8',
  ),
);

const MERGED: PullRequestState = {
  changedAt: '2026-11-05T18:22:41Z',
  kind: 'found',
  number: 661,
  state: 'MERGED',
};

const lookupReturning = (state: PullRequestState) => {
  return vi.fn<PullRequestLookup>(async () => state);
};

const withCommand = (command: string): Record<string, unknown> => {
  return { ...(isRecord(fixture) ? fixture : {}), command };
};

describe('readCursorShellCall', () => {
  it('reads the command and falls back to the workspace root for an empty cwd', () => {
    expect(readCursorShellCall(fixture)).toMatchObject({
      cwd: '/tmp/probe-repo',
    });
  });

  it('prefers a non-empty cwd', () => {
    expect(
      readCursorShellCall({ ...withCommand('ls'), cwd: '/work/sub' }),
    ).toEqual({ command: 'ls', cwd: '/work/sub' });
  });

  it('ignores other hook events', () => {
    expect(
      readCursorShellCall({ ...withCommand('ls'), hook_event_name: 'stop' }),
    ).toBeNull();
  });
});

describe('renderCursorBashGuard', () => {
  it('renders an allow as an explicit permission, never an empty body', () => {
    expect(JSON.parse(renderCursorBashGuard({ decision: 'allow' }))).toEqual({
      permission: 'allow',
    });
  });

  it('renders a deny with a short user message and the full agent message', () => {
    const out = renderCursorBashGuard({
      decision: 'deny',
      findings: [{ reason: 'no', ruleId: 'stale-pr-write' }],
    });
    expect(JSON.parse(out)).toEqual({
      agent_message: '[bash-guard:stale-pr-write] no',
      permission: 'deny',
      user_message: 'Blocked by the bash guard (stale-pr-write).',
    });
  });

  it('renders a warn as an allow carrying the agent message', () => {
    const out = renderCursorBashGuard({
      decision: 'warn',
      findings: [{ reason: 'careful', ruleId: 'r' }],
    });
    expect(JSON.parse(out)).toEqual({
      agent_message: '[bash-guard:r] careful',
      permission: 'allow',
    });
  });
});

describe('decideCursorBashGuard', () => {
  it("denies the fixture's f5d9515c command when the PR is MERGED", async () => {
    const lookupPullRequest = lookupReturning(MERGED);
    const out = await decideCursorBashGuard(fixture, '/fallback', {
      lookupPullRequest,
      lookupTimeoutMs: 3000,
      ...INERT_SHELL,
    });
    const response: unknown = JSON.parse(out);
    expect(response).toMatchObject({ permission: 'deny' });
    expect(out).toContain('MERGED');
    expect(lookupPullRequest).toHaveBeenCalledWith({
      cwd: '/tmp/probe-repo',
      repo: null,
      selector: '661',
    });
  });

  it('allows the same command when the PR is OPEN', async () => {
    const out = await decideCursorBashGuard(fixture, '/fallback', {
      lookupPullRequest: lookupReturning({ ...MERGED, state: 'OPEN' }),
      lookupTimeoutMs: 3000,
      ...INERT_SHELL,
    });
    expect(out).toBe(CURSOR_SHELL_ALLOW);
  });

  it('allows a non-gh command without any lookup', async () => {
    const lookupPullRequest = lookupReturning(MERGED);
    const out = await decideCursorBashGuard(
      withCommand('git status'),
      '/fallback',
      { lookupPullRequest, lookupTimeoutMs: 3000, ...INERT_SHELL },
    );
    expect(out).toBe(CURSOR_SHELL_ALLOW);
    expect(lookupPullRequest).not.toHaveBeenCalled();
  });

  it('allows a payload that is not a shell call', async () => {
    const out = await decideCursorBashGuard({ hello: 1 }, '/fallback', {
      lookupPullRequest: lookupReturning(MERGED),
      lookupTimeoutMs: 3000,
      ...INERT_SHELL,
    });
    expect(out).toBe(CURSOR_SHELL_ALLOW);
  });
});

describe('decideCursorBashGuard with the masked-exit rules', () => {
  const context = {
    lookupPullRequest: lookupReturning(MERGED),
    lookupTimeoutMs: 3000,
    ...INERT_SHELL,
  };

  it('warns on a trailing echo $? as an allow carrying agent_message', async () => {
    const out = await decideCursorBashGuard(
      withCommand('pnpm run check:local; echo exit=$?'),
      '/fallback',
      context,
    );
    const response: unknown = JSON.parse(out);
    expect(response).toMatchObject({ permission: 'allow' });
    expect(out).toContain('masked-exit-trailing');
  });

  it('warns on a validation piped into tail without pipefail', async () => {
    const out = await decideCursorBashGuard(
      withCommand('pnpm nx run x:test 2>&1 | tail -20'),
      '/fallback',
      context,
    );
    expect(out).toContain('masked-exit-pipeline');
  });

  it('allows the pipefail form with a bare allow', async () => {
    const out = await decideCursorBashGuard(
      withCommand('set -o pipefail; pnpm nx run x:test 2>&1 | tail -20'),
      '/fallback',
      context,
    );
    expect(out).toBe(CURSOR_SHELL_ALLOW);
  });
});

describe('decideCursorBashGuard with the portability rules', () => {
  const zshOnDarwin = (
    globMatches: (pattern: string, cwd: string) => Promise<boolean>,
  ) => {
    return {
      globMatches: vi.fn(globMatches),
      lookupPullRequest: lookupReturning(MERGED),
      lookupTimeoutMs: 3000,
      platform: 'darwin',
      shell: 'zsh',
    };
  };

  const decide = async (
    command: string,
    context: ReturnType<typeof zshOnDarwin>,
  ) => {
    const out = await decideCursorBashGuard(
      withCommand(command),
      '/fallback',
      context,
    );
    const parsed: unknown = JSON.parse(out);
    return isRecord(parsed) ? parsed : {};
  };

  it('denies an unquoted flag-value glob', async () => {
    const out = await decide(
      'grep -rn x . --include=*.ts',
      zshOnDarwin(async () => true),
    );
    expect(out.permission).toBe('deny');
    expect(out.agent_message).toContain('[bash-guard:zsh-unquoted-glob]');
  });

  it('checks a path glob in the workspace root the empty cwd falls back to', async () => {
    const context = zshOnDarwin(async () => false);
    const out = await decide(
      'ls applications/openthrottle-server/Dockerfile*',
      context,
    );
    expect(out.permission).toBe('deny');
    expect(context.globMatches).toHaveBeenCalledWith(
      'applications/openthrottle-server/Dockerfile*',
      '/tmp/probe-repo',
    );
  });

  it('denies GNU sed -i on darwin', async () => {
    const out = await decide(
      `sed -i 's/a/b/' f`,
      zshOnDarwin(async () => true),
    );
    expect(out.permission).toBe('deny');
    expect(out.agent_message).toContain('[bash-guard:bsd-sed-inplace]');
  });

  it('renders a zsh modifier warn as an allow carrying the agent message', async () => {
    const out = await decide(
      'for p in a b; do pnpm nx run "$p:typecheck"; done',
      zshOnDarwin(async () => true),
    );
    expect(out.permission).toBe('allow');
    expect(out.agent_message).toContain('[bash-guard:zsh-var-modifier]');
  });

  it('allows the quoted forms', async () => {
    const out = await decide(
      `grep -rn x . --include='*.ts' && sed -i '' 's/a/b/' f`,
      zshOnDarwin(async () => true),
    );
    expect(out).toEqual({ permission: 'allow' });
  });
});
