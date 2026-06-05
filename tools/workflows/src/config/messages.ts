import {
  RALPH_DEBUG_ENV,
  RALPH_DEBUG_ENV_LEGACY,
  RALPH_VERBOSE_ENV,
} from '../utils/ralph-debug-logger';
import {
  WORKFLOW_RALPH_CONFIG_ENV,
  WORKFLOW_RALPH_ENV,
} from '../config/load-workflow-ralph-config';
import { WORKFLOW_RALPH_TRANSPORT_ENV } from '../utils/workflow-transport';
import {
  OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV,
  WORKFLOW_RALPH_OT_DIAGNOSTICS_ENV,
} from '../utils/ot-diagnostics';
import { WORKFLOW_RALPH_CONFIG_PRECEDENCE } from '../config/workflow-ralph-defaults.types';
import { ARTWORK_LINE, ARTWORK_THANK_YOU, COLORS } from './index';

export const MESSAGE_TOOL_USAGE = `
Usage: ${COLORS.cyan}pnpm exec workflow-ralph --plan <cortex-plan-uuid> ${COLORS.gray}[options]${COLORS.reset}
       ${COLORS.cyan}pnpm exec workflow-ralph --task <cortex-task-uuid> ${COLORS.gray}[options]${COLORS.reset}

Required (one of):
  ${COLORS.cyan}--plan ${COLORS.gray}<uuid>${COLORS.reset}  Cortex plan ID (UUID)  ${COLORS.gray}ex: 77cb14a0-5eb0-4061-87ea-d618b85e8818${COLORS.reset}
  ${COLORS.cyan}--task ${COLORS.gray}<uuid>${COLORS.reset}  Cortex task ID (UUID); task-centric mode  ${COLORS.gray}ex: 45a30762-92a9-42f4-90e0-2437c7ef26a8${COLORS.reset}

Options:
  ${COLORS.cyan}--backend ${COLORS.gray}<cursor|claude>${COLORS.reset}  Execution backend (runner) for the entire plan run  ${COLORS.gray}default: ${COLORS.blue}cursor${COLORS.reset} (${COLORS.gray}cursor-agent${COLORS.reset}); ${COLORS.gray}claude${COLORS.reset} uses Claude Code CLI (${COLORS.gray}claude --bare -p …${COLORS.reset})
  ${COLORS.cyan}--debug ${COLORS.gray}[=verbose]${COLORS.reset}   Shim debug to stderr (lines prefixed ${COLORS.gray}[workflow-ralph:debug]${COLORS.reset}; see Environment below)
  ${COLORS.cyan}--help ${COLORS.reset}              Show this message
  ${COLORS.cyan}--iteration-timeout ${COLORS.gray}<seconds>${COLORS.reset}  Per-iteration timeout (non-interactive only)  ${COLORS.gray}e.g. 1800${COLORS.reset}
  ${COLORS.cyan}--iterations ${COLORS.gray}<number>${COLORS.reset}    Number of iterations to run  ${COLORS.gray}default: ${COLORS.blue}10${COLORS.reset}
  ${COLORS.cyan}--model ${COLORS.gray}<model> ${COLORS.reset}         Model preset when the backend supports it (${COLORS.gray}--model${COLORS.reset}; omit when ${COLORS.blue}'auto'${COLORS.reset} for Claude)  ${COLORS.gray}default: ${COLORS.blue}'auto'${COLORS.reset}
  ${COLORS.cyan}--project ${COLORS.gray}<name>${COLORS.reset}          NX project name (from project graph; applications + packages)
  ${COLORS.cyan}--prompt ${COLORS.gray}<prompt>${COLORS.reset}        Prompt profile (command-style path for Cursor)  ${COLORS.gray}default: ${COLORS.blue}/agents-ralph${COLORS.reset}
  ${COLORS.cyan}--prompt-file ${COLORS.gray}<path>${COLORS.reset}     Read layer-1 prompt text from a UTF-8 file (mutually exclusive with ${COLORS.cyan}--prompt${COLORS.reset})
  ${COLORS.cyan}--prompt-stdin ${COLORS.reset}           Read layer-1 prompt text from stdin (pipe; mutually exclusive with ${COLORS.cyan}--prompt${COLORS.reset} / ${COLORS.cyan}--prompt-file${COLORS.reset})
  ${COLORS.cyan}--verbose ${COLORS.reset}           Verbose shim debug (same as ${RALPH_DEBUG_ENV}=verbose or ${RALPH_VERBOSE_ENV}=1)
  ${COLORS.cyan}--worktree ${COLORS.gray}[name]${COLORS.reset}  Agent CLI isolated worktree (-w); optional name (cursor-agent, claude)
  ${COLORS.cyan}--worktree-base ${COLORS.gray}<branch>${COLORS.reset}  Cursor-only: base branch/ref for new agent worktree
  ${COLORS.cyan}--skip-worktree-setup ${COLORS.reset}  Cursor-only: skip .cursor/worktrees.json setup scripts

Environment (debug shim; optional — omit both flags to rely on env or file):
  ${COLORS.gray}${RALPH_DEBUG_ENV}${COLORS.reset}=1|true|verbose|0|off  ${COLORS.gray}${RALPH_DEBUG_ENV_LEGACY}${COLORS.reset} (alias)  ${COLORS.gray}${RALPH_VERBOSE_ENV}${COLORS.reset}=1 (verbose lines)
  File: ${COLORS.cyan}debug${COLORS.reset} in ${COLORS.cyan}.workflow-ralph.json${COLORS.reset} (${COLORS.gray}"omit" | "debug" | "verbose"${COLORS.reset})
  If ${COLORS.cyan}--debug${COLORS.reset} or ${COLORS.cyan}--verbose${COLORS.reset} appears on the command line, it overrides env and file for this run.

Environment (prompt profile + run tuning; optional):
  ${COLORS.gray}${WORKFLOW_RALPH_ENV.backend}${COLORS.reset}   Default execution backend id (${COLORS.green}cursor${COLORS.reset} or ${COLORS.green}claude${COLORS.reset}; one per plan run), same as ${COLORS.cyan}--backend${COLORS.reset}
  ${COLORS.gray}${WORKFLOW_RALPH_ENV.prompt}${COLORS.reset}   Default prompt profile (command-style), same as ${COLORS.cyan}--prompt${COLORS.reset}
  ${COLORS.gray}${WORKFLOW_RALPH_ENV.promptFile}${COLORS.reset}   Default prompt file path (UTF-8), same as ${COLORS.cyan}--prompt-file${COLORS.reset}
  ${COLORS.gray}${WORKFLOW_RALPH_ENV.iterations}${COLORS.reset}   Default iteration count (positive integer)
  ${COLORS.gray}${WORKFLOW_RALPH_ENV.iterationTimeout}${COLORS.reset}   Per-iteration timeout in ${COLORS.green}seconds${COLORS.reset} (non-interactive), same as ${COLORS.cyan}--iteration-timeout${COLORS.reset}
  ${COLORS.gray}${WORKFLOW_RALPH_ENV.model}${COLORS.reset}   Default model for the active backend, same as ${COLORS.cyan}--model${COLORS.reset}
  ${COLORS.gray}${WORKFLOW_RALPH_ENV.project}${COLORS.reset}   Default NX project, same as ${COLORS.cyan}--project${COLORS.reset}
  ${COLORS.gray}${WORKFLOW_RALPH_ENV.worktree}${COLORS.reset}   Agent CLI worktree name, same as ${COLORS.cyan}--worktree${COLORS.reset}
  ${COLORS.gray}${WORKFLOW_RALPH_ENV.worktreeBase}${COLORS.reset}   Cursor-only: ${COLORS.cyan}--worktree-base${COLORS.reset}
  ${COLORS.gray}${WORKFLOW_RALPH_ENV.skipWorktreeSetup}${COLORS.reset}   Cursor-only: truthy enables ${COLORS.cyan}--skip-worktree-setup${COLORS.reset}
  ${COLORS.gray}${WORKFLOW_RALPH_TRANSPORT_ENV}${COLORS.reset}   OpenThrottle I/O transport (${COLORS.green}graphql${COLORS.reset} default; ${COLORS.green}postgres-direct${COLORS.reset} or ${COLORS.green}postgres${COLORS.reset} for rollback)
  ${COLORS.gray}${WORKFLOW_RALPH_OT_DIAGNOSTICS_ENV}${COLORS.reset}   Opt-in OT identity stderr JSON before plan fetch (or ${COLORS.cyan}diagnostics.ot${COLORS.reset} in file)
  ${COLORS.gray}${OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV}${COLORS.reset}   Worker spawn diagnostics (or ${COLORS.cyan}diagnostics.spawn${COLORS.reset} in file)
  ${COLORS.gray}${WORKFLOW_RALPH_CONFIG_ENV.spawnHome}${COLORS.reset} / ${COLORS.gray}${WORKFLOW_RALPH_CONFIG_ENV.spawnXdgConfigHome}${COLORS.reset} / ${COLORS.gray}${WORKFLOW_RALPH_CONFIG_ENV.spawnOtRoot}${COLORS.reset}   Nested spawn tuning (or ${COLORS.cyan}spawn.home${COLORS.reset}, ${COLORS.cyan}spawn.xdgConfigHome${COLORS.reset}, ${COLORS.cyan}spawn.otRoot${COLORS.reset} in file)
  Optional repo-local defaults file: ${COLORS.cyan}.workflow-ralph.json${COLORS.reset} in the current working directory (see ${COLORS.cyan}tools/workflows/schemas/workflow-ralph.defaults.schema.json${COLORS.reset} for all keys).
  Precedence: ${COLORS.green}${WORKFLOW_RALPH_CONFIG_PRECEDENCE}${COLORS.reset}.
`;

export const MESSAGE_INTRO = `
${ARTWORK_LINE}

🎉 Welcome to the ${COLORS.green}Agentic Ralph Workflow${COLORS.reset} 🤖

This script automates the iterative, agentic task-execution loop described in
https://ghuntley.com/ralph for the selected structured plan. Leveraging the
Ralph approach, it orchestrates AI-powered breakdown, execution, and refinement
of complex product requirements or project plans - running each iteration as
an agentic loop and progressing through the plan until completion or error.

Learn more about the ${COLORS.green}Ralph${COLORS.reset} approach:

 - 📖 ${COLORS.cyan}https://ghuntley.com/ralph${COLORS.reset}
 - 📺 ${COLORS.cyan}https://www.youtube.com/watch?v=_IK18goX4X8${COLORS.reset}

${ARTWORK_LINE}
`;

export const MESSAGE_COMPLETED = `
${ARTWORK_LINE}\n

⚠️ All iterations have completed. Exiting...

${ARTWORK_LINE}
`;

export const MESSAGE_OUTRO = `
${ARTWORK_LINE}
${ARTWORK_THANK_YOU}
${ARTWORK_LINE}
`;
