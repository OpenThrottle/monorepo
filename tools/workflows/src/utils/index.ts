import { COLORS } from '../config/index';
import { MESSAGE_TOOL_USAGE } from '../config/messages';
import type { RalphArgs } from './parsers';
import {
  RALPH_DEBUG_ENV,
  RALPH_DEBUG_ENV_LEGACY,
  RALPH_VERBOSE_ENV,
} from './ralph-debug-logger';

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
    task,
  } = parsedArgs;

  console.log(`Workflow configuration:\n`);
  console.log(
    ` - 🖥️ execution backend: ${COLORS.green}${backend}${COLORS.reset} (runner)`,
  );
  console.log(` - 🔁 iterations: ${COLORS.green}${iterations}${COLORS.reset}`);
  if (iterationTimeoutMs !== undefined && iterationTimeoutMs >= 1) {
    const sec = Math.round(iterationTimeoutMs / 1000);
    console.log(
      ` - ⏱️ iteration-timeout: ${COLORS.green}${sec}s${COLORS.reset} (non-interactive)`,
    );
  }
  if (model) console.log(` - 🧠 model: ${COLORS.green}${model}${COLORS.reset}`);
  if (plan) console.log(` - 🧩 plan: ${COLORS.green}${plan}${COLORS.reset}`);
  if (project) {
    console.log(` - 📦 project: ${COLORS.green}${project}${COLORS.reset}`);
  }
  console.log(
    ` - 💬 prompt profile: ${COLORS.green}${promptProfileLabel}${COLORS.reset} (${promptProfileKind})`,
  );
  if (task) {
    const message = ` - 📌 task: ${COLORS.green}${task}${COLORS.reset} (task-centric)`;
    console.log(message);
  }
  if (ralphDebugLevel !== 'off') {
    console.log(
      ` - 🐛 workflow debug: ${COLORS.green}${ralphDebugLevel}${COLORS.reset} (${RALPH_DEBUG_ENV} / ${RALPH_DEBUG_ENV_LEGACY} / ${RALPH_VERBOSE_ENV} or --debug / --verbose)`,
    );
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
