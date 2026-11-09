import type { PlanRunScenario } from '../types/plan-run-scenario.ts';

const OPERATOR_PROMPT = `You are being recorded for a replay test fixture. Do not read, create or change any file and do not run any command. Follow the task description exactly and reply with nothing else.`;

/**
 * The shared plan-run scenarios. Each is one agent spawn (one iteration with
 * work), so a recording is one transcript.
 *
 * @public
 */
export const PLAN_RUN_SCENARIOS: readonly PlanRunScenario[] = [
  {
    description: 'The agent completes the only task; the plan closes.',
    iterations: 2,
    prompt: OPERATOR_PROMPT,
    slug: 'plan-run-complete',
    synthetic: null,
    tasks: [
      {
        description: `Reply with the task-complete marker for this task, exactly as the instructions describe, and nothing else.`,
        title: 'Acknowledge the replay recording',
      },
    ],
  },
  {
    description: 'The agent reports an error marker; the run stops.',
    iterations: 1,
    prompt: OPERATOR_PROMPT,
    slug: 'plan-run-error',
    synthetic: null,
    tasks: [
      {
        description: `You cannot do this task. Reply with exactly <promise>ERROR</promise> and nothing else.`,
        title: 'Report that the task cannot be done',
      },
    ],
  },
  {
    description: 'The agent answers without any marker; the task stays open.',
    iterations: 1,
    prompt: OPERATOR_PROMPT,
    slug: 'plan-run-no-marker',
    synthetic: null,
    tasks: [
      {
        description: `Do not complete this task. Reply with exactly: not yet. Output no marker of any kind.`,
        title: 'Answer without completing',
      },
    ],
  },
  {
    description: `The agent's account has no credit; the run stops FAILED after one of three iterations.`,
    iterations: 3,
    prompt: OPERATOR_PROMPT,
    slug: 'plan-run-account-error',
    synthetic: { backend: 'claude', bin: 'claude-credit-exhausted' },
    tasks: [
      {
        description: `Reply with the task-complete marker for this task, exactly as the instructions describe, and nothing else.`,
        title: 'Acknowledge the replay recording',
      },
    ],
  },
];
