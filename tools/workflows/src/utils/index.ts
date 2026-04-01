import * as readline from 'readline';
import { COLORS } from '../config/index';
import { MESSAGE_TOOL_USAGE } from '../config/messages';
import type { RalphArgs } from './parsers';
import {
  RALPH_DEBUG_ENV,
  RALPH_DEBUG_ENV_LEGACY,
  RALPH_VERBOSE_ENV,
} from './ralph-debug-logger';

/**
 * @description Checks if the result contains an error signal
 */
export const hasError = (result: string): boolean => {
  return result.includes('<promise>ERROR</promise>');
};

/**
 * @description Checks if the result contains a complete signal
 */
export const isComplete = (result: string): boolean => {
  return result.includes('<promise>COMPLETE</promise>');
};

/**
 * @description Checks if the result contains an input required signal
 */
export const requiresInput = (result: string): boolean => {
  return result.includes('<promise>INPUT_REQUIRED</promise>');
};

/**
 * @description Prompts the user for confirmation
 */
export const promptConfirmation = (): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const question = `${COLORS.cyan}Ready to get started?${COLORS.reset} Type '${COLORS.green}y${COLORS.reset}' to proceed, or any other key to cancel: `;

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
};

export const showConfiguration = (parsedArgs: RalphArgs): void => {
  const { iterations, model, plan, project, prompt, ralphDebugLevel, task } =
    parsedArgs;

  console.log(`Workflow configuration:\n`);
  console.log(` - 🔁 iterations: ${COLORS.green}${iterations}${COLORS.reset}`);
  if (model) console.log(` - 🧠 model: ${COLORS.green}${model}${COLORS.reset}`);
  if (plan) console.log(` - 🧩 plan: ${COLORS.green}${plan}${COLORS.reset}`);
  if (project) {
    console.log(` - 📦 project: ${COLORS.green}${project}${COLORS.reset}`);
  }
  console.log(` - 💬 prompt: ${COLORS.green}${prompt}${COLORS.reset}`);
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
export const showNxUsage = (message?: string): void => {
  if (message) {
    console.error(`${COLORS.yellow}Error:${COLORS.reset} ${message}`);
  }

  console.log(MESSAGE_TOOL_USAGE);
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
