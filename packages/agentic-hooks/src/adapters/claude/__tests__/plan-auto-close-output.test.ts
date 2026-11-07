import { describe, expect, it, vi } from 'vitest';

import type { TaskPlanLookup } from '../../../index.ts';
import {
  decideClaudePlanAutoClose,
  readUpdateTaskCall,
} from '../plan-auto-close-output.ts';

const TASK_ID = '11111111-1111-4111-8111-111111111111';

const updateTask = (toolInput: Record<string, unknown>) => {
  return {
    hook_event_name: 'PostToolUse',
    tool_input: toolInput,
    tool_name: 'mcp__openthrottle-mcp__update_task',
  };
};

const lookupReturning = (result: TaskPlanLookup | null) => {
  return vi.fn(async (_id: string): Promise<TaskPlanLookup | null> => result);
};

describe('readUpdateTaskCall', () => {
  it('reads id and status from an update_task payload', () => {
    expect(
      readUpdateTaskCall(updateTask({ id: TASK_ID, status: 'completed' })),
    ).toEqual({ status: 'completed', taskId: TASK_ID });
  });

  it('ignores other tools', () => {
    expect(
      readUpdateTaskCall({ tool_input: {}, tool_name: 'Bash' }),
    ).toBeNull();
  });
});

describe('decideClaudePlanAutoClose', () => {
  it('renders additionalContext when the plan closed', async () => {
    const output = await decideClaudePlanAutoClose(
      updateTask({ id: TASK_ID, status: 'completed' }),
      lookupReturning({
        planId: 'p1',
        planStatus: 'COMPLETED',
        taskTitle: 'T',
      }),
    );
    const parsed: unknown = JSON.parse(output ?? 'null');
    expect(parsed).toMatchObject({
      hookSpecificOutput: { hookEventName: 'PostToolUse' },
    });
    expect(output).toContain('closed plan p1');
  });

  it('prints nothing for a non-last task, BLOCKED status or failed lookup', async () => {
    const open = lookupReturning({
      planId: 'p1',
      planStatus: 'IN_PROGRESS',
      taskTitle: 'T',
    });
    expect(
      await decideClaudePlanAutoClose(
        updateTask({ id: TASK_ID, status: 'completed' }),
        open,
      ),
    ).toBeNull();
    expect(
      await decideClaudePlanAutoClose(
        updateTask({ id: TASK_ID, status: 'blocked' }),
        lookupReturning({
          planId: 'p1',
          planStatus: 'COMPLETED',
          taskTitle: 'T',
        }),
      ),
    ).toBeNull();
    expect(
      await decideClaudePlanAutoClose(
        updateTask({ id: TASK_ID, status: 'completed' }),
        lookupReturning(null),
      ),
    ).toBeNull();
  });
});
