/**
 * Tool-neutral matcher for shell commands a human would want to veto.
 */
import { DESTRUCTIVE_COMMAND_PATTERNS } from '../data/data.destructive-commands.ts';

/**
 * True when a shell command line contains a destructive or hard-to-undo
 * command (delete, history rewrite, push, PR creation, migration).
 *
 * @public
 */
export const isDestructiveCommand = (command: string): boolean => {
  return DESTRUCTIVE_COMMAND_PATTERNS.some((pattern) => pattern.test(command));
};
