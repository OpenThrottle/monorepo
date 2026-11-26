import { describe, expect, it, vi } from 'vitest';

import { decideClaudePlanRunInvariants } from '../claude-plan-run-output.ts';

const PLAN_ID = 'plan-2222';
const RUN_ID = 'run-1111';

const toolUse = (id: string, name: string, input: Record<string, unknown>) => {
  return {
    message: { content: [{ id, input, name, type: 'tool_use' }] },
    type: 'assistant',
  };
};

const toolResult = (toolUseId: string, content: string) => {
  return {
    message: {
      content: [{ content, tool_use_id: toolUseId, type: 'tool_result' }],
    },
    type: 'user',
  };
};

const register = [
  toolUse('r1', 'mcp__ot__register_plan_run', { planId: PLAN_ID }),
  toolResult('r1', JSON.stringify({ run: { id: RUN_ID } })),
];
const flip = (useId: string, taskId: string, status: string) => {
  return toolUse(useId, 'mcp__ot__update_task', { id: taskId, status });
};
const settle = toolUse('s1', 'mcp__ot__settle_plan_run', {});
const commit = (taskId: string) => {
  return toolUse('b1', 'Bash', {
    command: `git commit -q -F - <<'EOF'\nfeat: x\n\nPlan-Id: ${PLAN_ID}\nTask-Id: ${taskId}\nEOF`,
  });
};

const preToolUse = (taskId: string, status = 'IN_PROGRESS') => {
  return {
    hook_event_name: 'PreToolUse',
    tool_input: { id: taskId, status },
    tool_name: 'mcp__ot__update_task',
    transcript_path: '/t.jsonl',
  };
};
const stop = { hook_event_name: 'Stop', transcript_path: '/t.jsonl' };

const depsFor = (
  events: readonly unknown[],
  otInProgress: readonly string[] | null = [],
) => {
  return {
    lookupInProgress: vi.fn(async () => otInProgress),
    readEvents: () => events,
  };
};

const contextOf = (output: string | null): string => {
  const parsed: unknown = JSON.parse(output ?? 'null');
  return JSON.stringify(parsed);
};

describe('decideClaudePlanRunInvariants', () => {
  describe('double IN_PROGRESS (PreToolUse)', () => {
    it('warns when the transcript shows another task IN_PROGRESS', async () => {
      const deps = depsFor([...register, flip('u1', 't1', 'IN_PROGRESS')]);
      const output = await decideClaudePlanRunInvariants(
        preToolUse('t2'),
        deps,
      );
      const text = contextOf(output);
      expect(text).toContain('additionalContext');
      expect(text).toContain('Task t2 is going IN_PROGRESS');
      expect(text).toContain('task t1 is still IN_PROGRESS');
      expect(text).toContain(RUN_ID);
      expect(text).not.toContain('permissionDecision');
      expect(deps.lookupInProgress).not.toHaveBeenCalled();
    });

    it('asks OT when the transcript shows none, and warns on a carried-over task', async () => {
      const deps = depsFor(register, ['t0']);
      const output = await decideClaudePlanRunInvariants(
        preToolUse('t2'),
        deps,
      );
      expect(deps.lookupInProgress).toHaveBeenCalledWith(PLAN_ID);
      expect(contextOf(output)).toContain('task t0 is still IN_PROGRESS');
    });

    it('is silent in a clean state', async () => {
      const events = [
        ...register,
        flip('u1', 't1', 'IN_PROGRESS'),
        flip('u2', 't1', 'COMPLETED'),
      ];
      expect(
        await decideClaudePlanRunInvariants(preToolUse('t2'), depsFor(events)),
      ).toBeNull();
    });

    it('is silent when re-flipping the same task, or for another status', async () => {
      const events = [...register, flip('u1', 't1', 'IN_PROGRESS')];
      const deps = depsFor(events, ['t1']);
      expect(
        await decideClaudePlanRunInvariants(preToolUse('t1'), deps),
      ).toBeNull();
      expect(
        await decideClaudePlanRunInvariants(preToolUse('t2', 'BLOCKED'), deps),
      ).toBeNull();
    });

    it('is silent with no active run', async () => {
      const deps = depsFor([flip('u1', 't1', 'IN_PROGRESS')], ['t1']);
      expect(
        await decideClaudePlanRunInvariants(preToolUse('t2'), deps),
      ).toBeNull();
      const settled = depsFor([...register, settle], ['t1']);
      expect(
        await decideClaudePlanRunInvariants(preToolUse('t2'), settled),
      ).toBeNull();
    });

    it('is silent when OT is down', async () => {
      const deps = depsFor(register, null);
      expect(
        await decideClaudePlanRunInvariants(preToolUse('t2'), deps),
      ).toBeNull();
    });
  });

  describe('stranded at Stop', () => {
    it('warns about a task left IN_PROGRESS after its commit', async () => {
      const events = [
        ...register,
        flip('u1', 't1', 'IN_PROGRESS'),
        commit('t1'),
      ];
      const output = await decideClaudePlanRunInvariants(stop, depsFor(events));
      const text = contextOf(output);
      expect(text).toContain('systemMessage');
      expect(text).toContain('Task t1');
      expect(text).toContain('update_task to COMPLETED');
      expect(text).not.toContain('"decision"');
    });

    it('is silent when the committed task was flipped', async () => {
      const events = [
        ...register,
        flip('u1', 't1', 'IN_PROGRESS'),
        commit('t1'),
        flip('u2', 't1', 'COMPLETED'),
      ];
      expect(
        await decideClaudePlanRunInvariants(stop, depsFor(events)),
      ).toBeNull();
    });

    it('is silent for an IN_PROGRESS task not yet committed', async () => {
      const events = [
        ...register,
        flip('u1', 't1', 'IN_PROGRESS'),
        commit('t9'),
      ];
      expect(
        await decideClaudePlanRunInvariants(stop, depsFor(events)),
      ).toBeNull();
    });

    it('ignores a Task-Id in a command that is not a commit', async () => {
      const echo = toolUse('b2', 'Bash', { command: 'echo "Task-Id: t1"' });
      const events = [...register, flip('u1', 't1', 'IN_PROGRESS'), echo];
      expect(
        await decideClaudePlanRunInvariants(stop, depsFor(events)),
      ).toBeNull();
    });

    it('is silent with no active run', async () => {
      const events = [flip('u1', 't1', 'IN_PROGRESS'), commit('t1')];
      expect(
        await decideClaudePlanRunInvariants(stop, depsFor(events)),
      ).toBeNull();
    });
  });

  describe('when the payload or transcript is unusable', () => {
    it('is silent and never throws', async () => {
      expect(
        await decideClaudePlanRunInvariants('junk', depsFor([])),
      ).toBeNull();
      const failing = {
        lookupInProgress: async () => null,
        readEvents: () => {
          throw new Error('boom');
        },
      };
      expect(await decideClaudePlanRunInvariants(stop, failing)).toBeNull();
    });
  });
});
