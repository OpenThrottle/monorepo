/**
 * @description The two typeset surfaces video 05 puts on camera: the shell that
 * registers the MCP server, and the agent CLI that then writes a plan.
 *
 * ## Where the printed block comes from
 *
 * `mcp-instructions.txt` beside this file is the verbatim output of
 * `scripts/setup_mcp-instructions.ts` — specifically
 * `renderInstructions('/workspace/openthrottle', { claude: false, cursor: false })`
 * — captured once and committed. It is read at record time, the same way
 * `runner/format.ts` reads `docs/marketing/format.json`: a file read rather than an
 * import, because the app's tsconfig owns its own file list and a root-level script
 * is not in it (`tsc` says TS6307, and it is right to).
 *
 * Committed output is normally a drift hazard, so it is guarded rather than trusted:
 * `scripts/__tests__/setup_mcp-instructions.test.ts` asserts that the renderer still
 * produces this file byte for byte, and fails with the regeneration command when it
 * does not. That test lives at the root because the root project is the one that can
 * see both sides. The upside of a committed file is that the frame is reviewable in
 * a diff — you can read exactly what goes on camera without recording anything.
 *
 * ## Why the install state is fresh
 *
 * Every machine that can record this short already has OT MCP registered (that is
 * how the demo database gets seeded), so a live run of the command prints "already
 * installed, nothing to do" and the short has no subject. `renderInstructions` takes
 * `status` as a parameter for exactly this reason; the captured block is the
 * fresh-install rendering, which is the state the viewer is actually in.
 *
 * ## Why nothing here is a real machine
 *
 * `/workspace/openthrottle` is fictional and, unlike any `/Users/…` or `/home/…`
 * path, does not trip `scan/rules.ts` rule `home-path`. See `DEMO_MACHINE`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEMO_MACHINE, DEMO_PLANS } from '../fixtures/demo-content';
import { shellSurface } from './shell';

/** The plan the agent writes on camera. Fixture-seeded, newest in the workspace. */
const AGENT_PLAN_ID = 'd0d0d0d0-0000-4000-8000-000000000011';

const agentPlan = DEMO_PLANS.find((plan) => plan.id === AGENT_PLAN_ID);

if (!agentPlan) {
  throw new Error(
    `connect-ot-mcp: no fixture plan ${AGENT_PLAN_ID} — the payoff beat has nothing to land on`,
  );
}

const printedBlock = readFileSync(
  join(import.meta.dirname, 'mcp-instructions.txt'),
  'utf8',
).trimEnd();

/**
 * Split the printed block around the one line the short is about.
 *
 * The command is extracted FROM the block rather than written out, so "copy it" at
 * 0:09 and "run it" at 0:15 are provably the same string — the only claim those two
 * beats make. Splitting also gives the command line its own element, so the 0:09
 * highlight points at it instead of at all thirty lines, and the 9:16 crop has
 * something the width of one command to centre on.
 */
const lines = printedBlock.split('\n');
const commandIndex = lines.findIndex((line) =>
  line.startsWith('claude mcp add-json'),
);

if (commandIndex === -1) {
  throw new Error(
    'connect-ot-mcp: no `claude mcp add-json` line in mcp-instructions.txt — regenerate it (see the root setup_mcp-instructions test)',
  );
}

// Trimmed at the boundaries because HTML strips a pre's trailing newline: the blank
// lines that separated these runs in the text come back as CSS leading instead.
const registerCommand = lines[commandIndex];
const printedBefore = lines.slice(0, commandIndex).join('\n').trim();
const printedAfter = lines
  .slice(commandIndex + 1)
  .join('\n')
  .trim();

const launcher = `${DEMO_MACHINE.repositoryRoot}/scripts/run-openthrottle-mcp.sh`;

/**
 * What the agent reports back, built from the fixture rather than written out.
 *
 * If someone renames a task in `demo-content.ts`, this reply changes with it — so
 * the CLI on screen and the plan the browser cuts to in the next beat cannot
 * disagree, which is the one continuity error this short would be judged on.
 */
const agentReply = [
  `● Created plan "${agentPlan.title}"`,
  '',
  `    id       ${agentPlan.id}`,
  '    project  atlas-api',
  `    tasks    ${String(agentPlan.tasks.length)}`,
  '',
  ...agentPlan.tasks.map(
    (task, index) => `      ${String(index + 1)}. ${task.title}`,
  ),
].join('\n');

/**
 * The agent CLI's startup banner.
 *
 * The `openthrottle-mcp ✔ connected` line is the beat's whole point: it is the
 * visible proof that the restart did something, and without it the 0:24 narration
 * ("servers only load at startup") has nothing on screen to refer to.
 */
const agentBanner = [
  'Claude Code',
  '/help for help',
  '',
  `cwd: ${DEMO_MACHINE.repositoryRoot}`,
  '',
  'MCP servers:',
  '  openthrottle-mcp  ✔ connected',
].join('\n');

export const CONNECT_OT_MCP_SURFACES: Readonly<Record<string, string>> = {
  /**
   * The agent CLI, after the restart. A separate surface rather than another block,
   * because the CLI takes over the whole terminal — and the cut is what sells that
   * the restart happened.
   */
  agent: shellSurface({
    banner: agentBanner,
    blocks: [
      {
        id: 'ask',
        marker: '>',
        output: agentReply,
        outputHidden: true,
      },
    ],
    cwd: DEMO_MACHINE.shellPrompt,
    title: 'claude',
  }),

  /**
   * The setup session. Three commands in one scrollback, the last two hidden until
   * the beat that runs them, so the window fills up the way a real session does
   * instead of opening on a finished screen.
   */
  terminal: shellSurface({
    blocks: [
      {
        id: 'setup',
        output: [
          { id: 'setup-intro', text: printedBefore },
          // The line the narration means. Its own element so the beat can highlight
          // and crop to it; `#setup-claude-command` is what the flow points at.
          { id: 'setup-claude-command', text: registerCommand },
          // The Cursor block and the placeholder note. Kept in frame rather than
          // suppressed: passing `cursor: true` would have put "already installed" on
          // camera for a viewer who has never installed it.
          { id: 'setup-rest', text: printedAfter },
        ],
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'register',
        output: `Added stdio MCP server openthrottle-mcp with command: bash ${launcher} to user config`,
        outputHidden: true,
      },
      {
        hidden: true,
        id: 'restart',
      },
    ],
    cwd: DEMO_MACHINE.shellPrompt,
    title: DEMO_MACHINE.shellPrompt,
  }),
};

/**
 * @public The exact strings the flow types.
 *
 * Exported so the flow does not carry a second copy of a command that has to match
 * the one in the frame.
 */
export const CONNECT_OT_MCP_COMMANDS = {
  agentPrompt: 'create a plan to add request tracing, with three tasks',
  registerCommand,
  restartCommand: 'claude',
  setupCommand: 'pnpm run setup:mcp-instructions',
} as const;
