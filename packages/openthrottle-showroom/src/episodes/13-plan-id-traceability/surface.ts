/**
 * @description The typeset terminal video 13 opens on: `git log -1`, one commit,
 * and the `Plan-Id` / `Task-Id` footers the whole episode is about.
 *
 * ## What is real and what is replayed
 *
 * The footer format is the repo's real convention (`Plan-Id:` and `Task-Id:`
 * trailers, see the `github-commit` skill). The recorder cannot run `git log`
 * against a real history without putting a real author and real commit subjects
 * on camera, so the commit is fiction on the demo machine — but the ids in its
 * footer are read from the hero fixture, so the jump the flow makes next lands
 * on seeded data and the frame and the browser cannot disagree.
 *
 * Nothing here names a real person: the author is the fixture's fictional user.
 */

import {
  DEMO_MACHINE,
  DEMO_PLANS,
  DEMO_USER,
} from '../../fixtures/demo-content.ts';
import { shellSurface } from '../../surfaces/shell.ts';

/** The rate-limiting plan — the anchor 01, 03 and 04 use, so the season stays continuous. */
export const TRACEABILITY_PLAN_ID = 'd0d0d0d0-0000-4000-8000-000000000001';

/** Its IN_PROGRESS task, "Apply the bucket per API key" — the commit that is landing. */
export const TRACEABILITY_TASK_ID = 'd0d0d0d0-0000-4000-8000-000000000102';

const plan = DEMO_PLANS.find(
  (candidate) => candidate.id === TRACEABILITY_PLAN_ID,
);
const task = plan?.tasks.find(
  (candidate) => candidate.id === TRACEABILITY_TASK_ID,
);

if (!plan || !task) {
  throw new Error(
    `plan-id-traceability: no fixture task ${TRACEABILITY_TASK_ID} under plan ${TRACEABILITY_PLAN_ID} — the jump has nothing to land on`,
  );
}

const commitHeader = [
  `commit 9c41e7a05b3d8f2e6a1c47d09e5b8f3a2d6c1b70`,
  `Author: ${DEMO_USER.githubUsername} <${DEMO_USER.email}>`,
  `Date:   Fri Nov 20 16:42:07 2026 +0000`,
  ``,
  `    feat(gateway): apply the token bucket per API key`,
  ``,
  `    ${task.description}`,
].join('\n');

const commitFooter = [
  `    Plan-Id: ${plan.id}`,
  `    Task-Id: ${task.id}`,
].join('\n');

export const PLAN_ID_TRACEABILITY_SURFACES: Readonly<Record<string, string>> = {
  /**
   * One command, typed on camera. The footer is its own output part so a beat can
   * zoom and highlight the two trailer lines without the rest of the commit.
   */
  terminal: shellSurface({
    blocks: [
      {
        id: 'log',
        output: [
          { id: 'log-head', text: commitHeader },
          { id: 'log-footer', text: commitFooter },
        ],
        outputHidden: true,
      },
    ],
    cwd: DEMO_MACHINE.shellPrompt,
    title: 'zsh',
  }),
};

/**
 * @public What the flow types and waits for.
 *
 * Exported so the flow does not carry a second copy of a string that has to
 * match the frame.
 */
export const PLAN_ID_TRACEABILITY = {
  command: 'git log -1',
  planId: plan.id,
  planTitle: plan.title,
  taskId: task.id,
  taskTitle: task.title,
} as const;
