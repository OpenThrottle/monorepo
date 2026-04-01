import {
  RALPH_DEBUG_ENV,
  RALPH_DEBUG_ENV_LEGACY,
  RALPH_VERBOSE_ENV,
} from '../utils/ralph-debug-logger';
import { ARTWORK_LINE, ARTWORK_THANK_YOU, COLORS } from './index';

export const MESSAGE_ON_CANCEL = `${COLORS.yellow}🚫 Cancelled.${COLORS.reset}`;

export const MESSAGE_TOOL_USAGE = `
Usage: ${COLORS.cyan}pnpm exec workflow-ralph --plan <cortex-plan-uuid> ${COLORS.gray}[options]${COLORS.reset}
       ${COLORS.cyan}pnpm exec workflow-ralph --task <cortex-task-uuid> ${COLORS.gray}[options]${COLORS.reset}

Required (one of):
  ${COLORS.cyan}--plan ${COLORS.gray}<uuid>${COLORS.reset}  Cortex plan ID (UUID)  ${COLORS.gray}ex: 77cb14a0-5eb0-4061-87ea-d618b85e8818${COLORS.reset}
  ${COLORS.cyan}--task ${COLORS.gray}<uuid>${COLORS.reset}  Cortex task ID (UUID); task-centric mode  ${COLORS.gray}ex: 45a30762-92a9-42f4-90e0-2437c7ef26a8${COLORS.reset}

Options:
  ${COLORS.cyan}--debug ${COLORS.gray}[=verbose]${COLORS.reset}   Shim debug to stderr (lines prefixed ${COLORS.gray}[workflow-ralph:debug]${COLORS.reset}; see Environment below)
  ${COLORS.cyan}--help ${COLORS.reset}              Show this message
  ${COLORS.cyan}--iteration-timeout ${COLORS.gray}<seconds>${COLORS.reset}  Per-iteration timeout (non-interactive only)  ${COLORS.gray}e.g. 1800${COLORS.reset}
  ${COLORS.cyan}--iterations ${COLORS.gray}<number>${COLORS.reset}    Number of iterations to run  ${COLORS.gray}default: ${COLORS.blue}10${COLORS.reset}
  ${COLORS.cyan}--model ${COLORS.gray}<model> ${COLORS.reset}         Cursor model to use  ${COLORS.gray}default: ${COLORS.blue}'auto'${COLORS.reset}
  ${COLORS.cyan}--project ${COLORS.gray}<name>${COLORS.reset}          NX project name (from project graph; applications + packages)
  ${COLORS.cyan}--prompt ${COLORS.gray}<prompt>${COLORS.reset}        Prompt for the agent  ${COLORS.gray}default: ${COLORS.blue}/agents/ralph${COLORS.reset}
  ${COLORS.cyan}--verbose ${COLORS.reset}           Verbose shim debug (same as ${RALPH_DEBUG_ENV}=verbose or ${RALPH_VERBOSE_ENV}=1)

Environment (debug shim; optional — omit both flags to rely on env only):
  ${COLORS.gray}${RALPH_DEBUG_ENV}${COLORS.reset}=1|true|verbose|0|off  ${COLORS.gray}${RALPH_DEBUG_ENV_LEGACY}${COLORS.reset} (alias)  ${COLORS.gray}${RALPH_VERBOSE_ENV}${COLORS.reset}=1 (verbose lines)
  If ${COLORS.cyan}--debug${COLORS.reset} or ${COLORS.cyan}--verbose${COLORS.reset} appears on the command line, it overrides these variables for this run.
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
