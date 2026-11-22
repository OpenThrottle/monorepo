/**
 * @description The typeset agent session video 03 puts on camera: an agent asked
 * for a plan, and the two OpenThrottle MCP calls it makes to write one.
 *
 * ## What is real and what is replayed
 *
 * The tool names and argument names are the real ones — `create_plan` takes
 * `title`, `author`, `category` and `summary`, and `create_tasks` takes a `planId`
 * and an array of tasks (`packages/openthrottle-mcp/src/tools/plans.ts` and
 * `tasks.ts`). The recorder cannot make a live MCP call, though, so the values are
 * read from the hero fixture plan the app payoff lands on, which is what keeps the
 * frame and the browser from disagreeing: the typed title and every task title are
 * that plan's own, verbatim, and the id the "result" prints is its id.
 *
 * Nothing here names a real machine: the cwd is `DEMO_MACHINE.shellPrompt` and the
 * author is the fixture's fictional user.
 */

import {
  DEMO_MACHINE,
  DEMO_PLANS,
  DEMO_USER,
} from '../../fixtures/demo-content.ts';
import { shellSurface } from '../../surfaces/shell.ts';

/** The rate-limiting plan — the same anchor 01 and 04 use, so the season stays continuous. */
export const FIRST_PLAN_ID = 'd0d0d0d0-0000-4000-8000-000000000001';

const plan = DEMO_PLANS.find((candidate) => candidate.id === FIRST_PLAN_ID);

if (!plan) {
  throw new Error(
    `first-plan: no fixture plan ${FIRST_PLAN_ID} — the payoff beat has nothing to land on`,
  );
}

const orderedTasks = [...plan.tasks].sort(
  (left, right) => left.sortOrder - right.sortOrder,
);

const createPlanArguments = JSON.stringify(
  {
    author: DEMO_USER.githubUsername,
    category: plan.category,
    summary: plan.summary,
    title: plan.title,
  },
  null,
  2,
);

/**
 * The tasks go in the order they are meant to run, and carry no `sortOrder`: the
 * tool appends in array order when it is omitted, which is the behaviour the
 * narration ("in the order you want it done") is describing.
 */
const createTasksArguments = JSON.stringify(
  {
    planId: plan.id,
    tasks: orderedTasks.map((task) => ({
      category: task.category,
      title: task.title,
    })),
  },
  null,
  2,
);

const createPlanResult = `Created plan: ${plan.id}`;

const createTasksResult = [
  `Created ${String(orderedTasks.length)} task(s):`,
  ...orderedTasks.map((task) => ` - ${task.id} ${task.title}`),
].join('\n');

const banner = ['Claude Code', '', `cwd: ${DEMO_MACHINE.repositoryRoot}`].join(
  '\n',
);

export const FIRST_PLAN_SURFACES: Readonly<Record<string, string>> = {
  /**
   * One session, three blocks. The prompt is typed on camera; each tool call is
   * hidden until the beat that shows it, so the scrollback fills the way a real
   * agent session does. The result of each call is its own hidden part inside the
   * call, so "it asks, then it answers" is two reveals rather than two surfaces.
   */
  agent: shellSurface({
    banner,
    blocks: [
      { id: 'ask', marker: '>' },
      {
        command: 'openthrottle-mcp - create_plan (MCP)',
        hidden: true,
        id: 'plan-call',
        marker: '●',
        output: [
          { id: 'plan-args', text: createPlanArguments },
          { hidden: true, id: 'plan-result', text: createPlanResult },
        ],
      },
      {
        command: 'openthrottle-mcp - create_tasks (MCP)',
        hidden: true,
        id: 'tasks-call',
        marker: '●',
        output: [
          { id: 'tasks-args', text: createTasksArguments },
          { hidden: true, id: 'tasks-result', text: createTasksResult },
        ],
      },
    ],
    cwd: DEMO_MACHINE.shellPrompt,
    title: 'claude',
  }),
};

/**
 * @public What the flow types, and the rows it points at.
 *
 * Exported so the flow does not carry a second copy of a string that has to match
 * the frame.
 */
export const FIRST_PLAN = {
  firstTaskId: orderedTasks[0]?.id ?? '',
  lastTaskId: orderedTasks[orderedTasks.length - 1]?.id ?? '',
  planId: plan.id,
  prompt: 'plan out rate limiting for the public API, three tasks in order',
  taskTitles: orderedTasks.map((task) => task.title),
  title: plan.title,
} as const;
