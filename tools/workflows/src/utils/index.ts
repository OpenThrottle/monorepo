import { COLORS } from '../config/index';
import { MESSAGE_TOOL_USAGE } from '../config/messages';
import type { RalphArgs } from './parsers';

/**
 * @description Checks if the result contains a complete signal
 */
export const isComplete = (result: string): boolean => {
  return result.includes('<promise>COMPLETE</promise>');
};

export const showConfiguration = (parsedArgs: RalphArgs): void => {
  const {
    backend,
    iterationTimeoutMs,
    iterations,
    model,
    plan,
    project,
    promptProfileKind,
    promptProfileLabel,
    ralphDebugLevel,
    skipWorktreeSetup,
    task,
    worktree,
    worktreeBase,
  } = parsedArgs;

  console.log(`Workflow configuration:\n`);

  console.log(` - 🖥️  execution backend: ${COLORS.green}${backend}${COLORS.reset} (runner)`); // prettier-ignore
  console.log(` - 🔁 iterations: ${COLORS.green}${iterations}${COLORS.reset}`);

  if (iterationTimeoutMs !== undefined && iterationTimeoutMs >= 1) {
    const sec = Math.round(iterationTimeoutMs / 1000);
    console.log(` - ⏱️ iteration-timeout: ${COLORS.green}${sec}s${COLORS.reset} (non-interactive)`); // prettier-ignore
  }

  if (model) console.log(` - 🧠 model: ${COLORS.green}${model}${COLORS.reset}`);
  if (plan) console.log(` - 🧩 plan: ${COLORS.green}${plan}${COLORS.reset}`);
  if (project) console.log(` - 📦 project: ${COLORS.green}${project}${COLORS.reset}`); // prettier-ignore

  console.log(` - 💬 prompt profile: ${COLORS.green}${promptProfileLabel}${COLORS.reset} (${promptProfileKind})`); // prettier-ignore

  if (task) console.log(` - 📌 task: ${COLORS.green}${task}${COLORS.reset} (task-centric)`); // prettier-ignore
  if (ralphDebugLevel !== 'off') console.log(` - 🐛 debug: ${COLORS.green}${ralphDebugLevel}${COLORS.reset}`); // prettier-ignore

  if (worktree !== undefined) {
    const label = worktree === '' ? '(agent default name)' : worktree;
    console.log(` - 🌳 worktree: ${COLORS.green}${label}${COLORS.reset} (agent CLI)`); // prettier-ignore
  }

  if (worktreeBase) {
    console.log(` - 🌳 worktree-base: ${COLORS.green}${worktreeBase}${COLORS.reset}`); // prettier-ignore
  }

  if (skipWorktreeSetup === true) {
    console.log(` - 🌳 skip-worktree-setup: ${COLORS.green}true${COLORS.reset}`); // prettier-ignore
  }
};

/**
 * @description Displays usage information and exits
 */
export const showRalphUsage = (message?: string): void => {
  if (message) {
    console.error(`${COLORS.yellow}Error:${COLORS.reset} ${message}`);
  }

  console.log(MESSAGE_TOOL_USAGE);
};
