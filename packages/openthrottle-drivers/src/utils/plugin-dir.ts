/**
 * @description Capability-driven `--plugin-dir` formatting shared by driver command builders.
 * Mirrors `appendWorktreeShellFlags` / `appendMcpShellFlags`: the flag is emitted only when the
 * driver advertises `capabilities.pluginDir` and the caller actually supplied a directory.
 *
 * This is leg B of the child-repo hook overlay (see `docs/monorepo/child-repo-hook-overlay.md`):
 * pointing an agent CLI at OT's plugin payload out-of-repo means an orchestrated run in ANY foreign
 * checkout carries OT's hooks without a single byte being written into that checkout, and without
 * the user having installed anything.
 *
 * Unlike the MCP flags, the values here are caller input rather than module constants — a payload
 * path can contain spaces — so every directory goes through {@link escapeShellArg}.
 *
 * Resolving WHICH directory (existence, the container path bridge, the operator's kill switch) is
 * deliberately not done here: this package is a dep-free leaf of pure descriptors and string
 * builders that never touches the filesystem. The impure resolver lives in
 * `@openthrottle/openthrottle-agentic-utils`, which already owns that boundary, and hands the
 * resolved paths down through {@link DriverInvocationConfig.pluginDirs}.
 */

import type { DriverCapabilities } from '../types/index.ts';
import { escapeShellArg } from './shell.ts';

/**
 * @description Workspace-relative location of OT's generated Claude Code plugin payload, produced
 * by `@openthrottle/agentic-hooks`' `bundle-hooks` target. Exported so the resolver in
 * agentic-utils and this package agree on one spelling of the path rather than two.
 * @public
 */
export const OPENTHROTTLE_PLUGIN_DIR_REL = 'plugins/openthrottle';

/**
 * @description Appends one repeatable `--plugin-dir <path>` per supplied directory. Returns the
 * command unchanged when the driver lacks the `pluginDir` capability, when nothing was supplied, or
 * when every entry is blank — so callers can pass a possibly-empty list unconditionally and a
 * failed resolution degrades to a normal run rather than a broken one.
 * @public
 */
export const appendPluginDirShellFlags = (
  command: string,
  capabilities: DriverCapabilities,
  pluginDirs: readonly string[] | undefined,
): string => {
  if (!capabilities.pluginDir || pluginDirs === undefined) {
    return command;
  }

  const parts = pluginDirs
    .map((dir) => dir.trim())
    .filter((dir) => dir !== '')
    .map((dir) => `--plugin-dir ${escapeShellArg(dir)}`);

  if (parts.length === 0) {
    return command;
  }

  return `${command} ${parts.join(' ')}`;
};
