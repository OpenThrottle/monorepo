import { describe, expect, it } from 'vitest';

import type {
  AgentCheckoutContext,
  AgentCheckoutRegistration,
  OrphanSweepFs,
} from '../utils/agent-checkout-registrations.ts';
import {
  AGENT_CHECKOUT_REGISTRATIONS,
  pruneAgentCheckoutOrphans,
  runAgentCheckoutRegistrations,
} from '../utils/agent-checkout-registrations.ts';

const CHECKOUT = '/Users/someone/.openthrottle/worktrees/o/monorepo/wt';
const CONTEXT: AgentCheckoutContext = {
  env: {},
  primary: '/Users/someone/Development/monorepo',
};

/** A fake entry that records which of its steps ran. */
const fakeEntry = (
  agent: string,
  overrides: Partial<AgentCheckoutRegistration> = {},
): { readonly calls: string[]; readonly entry: AgentCheckoutRegistration } => {
  const calls: string[] = [];
  const entry: AgentCheckoutRegistration = {
    agent,
    applies: () => {
      return { applies: true };
    },
    listOrphans: () => {
      return { checkouts: [], kind: 'ok' };
    },
    optOutEnv: `OPENTHROTTLE_${agent.toUpperCase()}_FAKE`,
    register: (checkout) => {
      calls.push(`register ${checkout}`);
      return { kind: 'ok', message: `${agent} registered` };
    },
    unregister: (checkout) => {
      calls.push(`unregister ${checkout}`);
      return { kind: 'ok', message: `${agent} unregistered` };
    },
    ...overrides,
  };
  return { calls, entry };
};

describe('runAgentCheckoutRegistrations', () => {
  it('runs the requested half of every entry, in order', () => {
    const alpha = fakeEntry('alpha');
    const beta = fakeEntry('beta');

    const results = runAgentCheckoutRegistrations({
      checkout: CHECKOUT,
      context: CONTEXT,
      entries: [alpha.entry, beta.entry],
      operation: 'unregister',
    });

    expect(results).toEqual([
      {
        agent: 'alpha',
        outcome: { kind: 'ok', message: 'alpha unregistered' },
      },
      { agent: 'beta', outcome: { kind: 'ok', message: 'beta unregistered' } },
    ]);
    expect(alpha.calls).toEqual([`unregister ${CHECKOUT}`]);
    expect(beta.calls).toEqual([`unregister ${CHECKOUT}`]);
  });

  it('skips an opted-out entry and still runs the next one', () => {
    const alpha = fakeEntry('alpha');
    const beta = fakeEntry('beta');

    const results = runAgentCheckoutRegistrations({
      checkout: CHECKOUT,
      context: { ...CONTEXT, env: { [alpha.entry.optOutEnv]: '0' } },
      entries: [alpha.entry, beta.entry],
      operation: 'register',
    });

    expect(results[0]?.outcome).toEqual({
      kind: 'skipped',
      reason: `${alpha.entry.optOutEnv}=0`,
    });
    expect(alpha.calls).toEqual([]);
    expect(beta.calls).toEqual([`register ${CHECKOUT}`]);
  });

  it('skips an entry whose precondition is unmet (its CLI is missing)', () => {
    const alpha = fakeEntry('alpha', {
      applies: () => {
        return { applies: false, reason: 'alpha is not installed' };
      },
    });

    const results = runAgentCheckoutRegistrations({
      checkout: CHECKOUT,
      context: CONTEXT,
      entries: [alpha.entry],
      operation: 'unregister',
    });

    expect(results[0]?.outcome).toEqual({
      kind: 'skipped',
      reason: 'alpha is not installed',
    });
    expect(alpha.calls).toEqual([]);
  });

  it('turns a throwing step into a failed outcome without stopping the loop', () => {
    const alpha = fakeEntry('alpha', {
      unregister: () => {
        throw new Error('cli exploded');
      },
    });
    const beta = fakeEntry('beta');

    const results = runAgentCheckoutRegistrations({
      checkout: CHECKOUT,
      context: CONTEXT,
      entries: [alpha.entry, beta.entry],
      operation: 'unregister',
    });

    expect(results[0]?.outcome).toEqual({
      kind: 'failed',
      message: 'alpha: cli exploded',
    });
    expect(beta.calls).toEqual([`unregister ${CHECKOUT}`]);
  });
});

describe('AGENT_CHECKOUT_REGISTRATIONS', () => {
  it('registers Claude and deliberately leaves codex (primary-only trust) off', () => {
    const agents = AGENT_CHECKOUT_REGISTRATIONS.map((entry) => entry.agent);

    expect(agents).toContain('claude');
    expect(agents).not.toContain('codex');
  });
});

/** An in-memory filesystem: `existing` paths exist; makeDir/removeDir are recorded. */
const fakeFs = (
  existing: readonly string[] = [],
): {
  readonly fs: OrphanSweepFs;
  readonly made: string[];
  readonly removed: string[];
} => {
  const present = new Set(existing);
  const made: string[] = [];
  const removed: string[] = [];
  const fs: OrphanSweepFs = {
    exists: (path) => {
      return present.has(path);
    },
    makeDir: (path) => {
      made.push(path);
      present.add(path);
      return path;
    },
    removeDir: (path) => {
      removed.push(path);
      present.delete(path);
    },
  };
  return { fs, made, removed };
};

const GONE_A = '/Users/someone/.openthrottle/worktrees/o/monorepo/gone-a';
const GONE_B = '/Users/someone/.openthrottle/worktrees/o/monorepo/gone-b';

describe('pruneAgentCheckoutOrphans', () => {
  /** An entry whose registrations live in a set, so unregistering really removes the orphan. */
  const statefulEntry = (
    agent: string,
    registered: Set<string>,
    exists: (path: string) => boolean,
  ): AgentCheckoutRegistration => {
    return fakeEntry(agent, {
      listOrphans: () => {
        return { checkouts: [...registered].filter((path) => !exists(path)), kind: 'ok' }; // prettier-ignore
      },
      unregister: (checkout) => {
        registered.delete(checkout);
        return { kind: 'ok', message: `${agent} unregistered` };
      },
    }).entry;
  };

  it('lists orphans per agent on --dry-run and changes nothing', () => {
    const { fs, made } = fakeFs();
    const alpha = fakeEntry('alpha', {
      listOrphans: () => {
        return { checkouts: [GONE_A], kind: 'ok' };
      },
    });
    const beta = fakeEntry('beta', {
      listOrphans: () => {
        return { checkouts: [GONE_B], kind: 'ok' };
      },
    });

    const sweeps = pruneAgentCheckoutOrphans({
      context: CONTEXT,
      dryRun: true,
      entries: [alpha.entry, beta.entry],
      fs,
    });

    expect(sweeps).toEqual([
      { agent: 'alpha', dryRun: true, items: [{ checkout: GONE_A, outcome: { kind: 'ok', message: 'would unregister' } }], kind: 'ok' }, // prettier-ignore
      { agent: 'beta', dryRun: true, items: [{ checkout: GONE_B, outcome: { kind: 'ok', message: 'would unregister' } }], kind: 'ok' }, // prettier-ignore
    ]);
    expect(made).toEqual([]);
    expect(alpha.calls).toEqual([]);
  });

  it('recreates each orphan, unregisters inside it, removes only what it created, and is idempotent', () => {
    const { fs, made, removed } = fakeFs();
    const registered = new Set([GONE_A, GONE_B]);
    const alpha = statefulEntry('alpha', registered, fs.exists);

    const first = pruneAgentCheckoutOrphans({ context: CONTEXT, dryRun: false, entries: [alpha], fs }); // prettier-ignore
    const second = pruneAgentCheckoutOrphans({ context: CONTEXT, dryRun: false, entries: [alpha], fs }); // prettier-ignore

    expect(registered.size).toBe(0);
    expect(made).toEqual([GONE_A, GONE_B]);
    expect(removed).toEqual([GONE_A, GONE_B]);
    expect(first[0]).toMatchObject({ items: [{}, {}], kind: 'ok' });
    expect(second[0]).toMatchObject({ items: [], kind: 'ok' });
  });

  it('never touches a path that exists, or one inside another git checkout', () => {
    const nested = '/Users/someone/Development/repo/.claude/worktrees/gone';
    const { fs, made, removed } = fakeFs([GONE_A, '/Users/someone/Development/repo/.git']); // prettier-ignore
    const alpha = fakeEntry('alpha', {
      listOrphans: () => {
        return { checkouts: [GONE_A, nested], kind: 'ok' };
      },
    });

    const sweeps = pruneAgentCheckoutOrphans({ context: CONTEXT, dryRun: false, entries: [alpha.entry], fs }); // prettier-ignore

    expect(sweeps[0]).toMatchObject({
      items: [
        { checkout: GONE_A, outcome: { kind: 'skipped' } },
        { checkout: nested, outcome: { kind: 'skipped' } },
      ],
    });
    expect(alpha.calls).toEqual([]);
    expect(made).toEqual([]);
    expect(removed).toEqual([]);
  });

  it('removes the directory it created even when unregister throws', () => {
    const { fs, removed } = fakeFs();
    const alpha = fakeEntry('alpha', {
      listOrphans: () => {
        return { checkouts: [GONE_A], kind: 'ok' };
      },
      unregister: () => {
        throw new Error('cli exploded');
      },
    });

    const sweeps = pruneAgentCheckoutOrphans({ context: CONTEXT, dryRun: false, entries: [alpha.entry], fs }); // prettier-ignore

    expect(sweeps[0]).toMatchObject({ items: [{ outcome: { kind: 'failed', message: 'cli exploded' } }] }); // prettier-ignore
    expect(removed).toEqual([GONE_A]);
  });

  it('reports an agent whose CLI is missing as skipped, not failed', () => {
    const { fs } = fakeFs();
    const alpha = fakeEntry('alpha', {
      applies: () => {
        return { applies: false, reason: 'alpha is not installed' };
      },
    });

    const sweeps = pruneAgentCheckoutOrphans({ context: CONTEXT, dryRun: false, entries: [alpha.entry], fs }); // prettier-ignore

    expect(sweeps).toEqual([{ agent: 'alpha', kind: 'skipped', reason: 'alpha is not installed' }]); // prettier-ignore
  });
});
