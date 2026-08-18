/**
 * @description Capability-driven MCP flag formatting shared by driver command builders. Mirrors
 * `appendWorktreeShellFlags`: the flags are emitted only when the driver advertises
 * `capabilities.mcpAutoApprove`, so a driver whose CLI attaches MCP automatically — or has no MCP
 * support at all — contributes nothing to the command string.
 *
 * The flags themselves are supplied by the calling driver rather than hardcoded here, because each
 * CLI spells this differently (Cursor: `--approve-mcps --trust`). Flags are emitted verbatim and are
 * therefore module constants only — never caller input, so there is nothing to escape.
 */

import type { DriverCapabilities } from '../types/index.ts';

/**
 * @description Appends a driver's MCP-enabling flags to a base command. Returns the command
 * unchanged when the driver lacks the `mcpAutoApprove` capability or supplies no flags.
 * @public
 */
export const appendMcpShellFlags = (
  command: string,
  capabilities: DriverCapabilities,
  flags: readonly string[],
): string => {
  if (!capabilities.mcpAutoApprove || flags.length === 0) {
    return command;
  }

  return `${command} ${flags.join(' ')}`;
};
