/**
 * @description Leg B of the child-repo hook overlay: resolving OT's generated Claude Code plugin
 * payload so a driver can point `--plugin-dir` at it. An OT-orchestrated run in ANY foreign
 * checkout then carries OT's hooks with nothing written into that checkout, and with nothing the
 * user had to install.
 *
 * The impure half deliberately lives here rather than in `@openthrottle/openthrottle-drivers`,
 * which is a dep-free leaf of pure descriptors that never touches the filesystem (and which this
 * package already depends on, so the reverse import would be a cycle). This module does the
 * filesystem work and hands the drivers package a resolved list of directories.
 *
 * See `docs/monorepo/child-repo-hook-overlay.md` and
 * `docs/monorepo/child-repo-hook-telemetry-contract.md`.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { OPENTHROTTLE_PLUGIN_DIR_REL } from '@openthrottle/openthrottle-drivers';

import { getOpenThrottleRoot } from './workflow.ts';

/**
 * Env var gating hook-plugin injection. Injection is ON by default; set this to a falsy value
 * (`0`/`false`/`no`/`off`, case-insensitive) to suppress it.
 *
 * The switch exists for repositories the OT operator does not own: the payload is telemetry, and
 * "on by default" is only defensible for checkouts the operator controls. Turning it off here costs
 * zero process time in the target, because the flag is simply never emitted.
 *
 * @public
 */
export const HOOK_PLUGIN_ENABLED_ENV = 'OPENTHROTTLE_HOOK_PLUGIN_ENABLED';

/**
 * Env var overriding the plugin payload directory. Defaults to `<ot-root>/plugins/openthrottle`.
 * Useful when the payload has been staged somewhere else (a published copy, a mounted volume).
 *
 * @public
 */
export const HOOK_PLUGIN_DIR_ENV = 'OPENTHROTTLE_HOOK_PLUGIN_DIR';

const FALSY = new Set(['0', 'false', 'no', 'off']);

/** Default ON: only an explicitly falsy value disables injection. */
const isEnabled = (env: NodeJS.ProcessEnv): boolean => {
  const raw = env[HOOK_PLUGIN_ENABLED_ENV]?.trim().toLowerCase();
  return raw === undefined || raw === '' || !FALSY.has(raw);
};

/**
 * A directory is a usable payload only when it actually carries a plugin manifest. Checking the
 * manifest rather than the directory means a half-staged or empty directory degrades to "no
 * injection" instead of handing the CLI something it will reject.
 */
const isPluginPayload = (dir: string): boolean => {
  try {
    return fs
      .statSync(path.join(dir, '.claude-plugin', 'plugin.json'))
      .isFile();
  } catch {
    return false;
  }
};

/**
 * Module-scoped so an unresolvable payload warns once per process rather than once per iteration.
 * A telemetry overlay that cannot be delivered is a footnote, not a running commentary.
 */
let warned = false;

/** Options for {@link resolveHookPluginDirs}. */
export interface ResolveHookPluginDirsOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly warn?: (message: string) => void;
}

/**
 * @description Resolves the plugin directories to pass to a driver's `pluginDirs`. Returns an empty
 * array — never throws — when injection is gated off, when the OT root cannot be found, or when no
 * payload is present at the resolved location.
 *
 * **Fail-open by construction.** An empty result makes the driver emit no `--plugin-dir` flag, so a
 * missing or broken payload degrades to an ordinary run. Telemetry must never be able to break the
 * work it is observing, which is the same stance the hook core itself takes.
 *
 * **No container-path translation.** `toContainerPath` exists for host-recorded paths read out of
 * the database (`WorkspaceLocalRepository.filesystemPath`, plan `workingDirectory`). The payload
 * path is not one of those: it is derived from this process's own filesystem via
 * {@link getOpenThrottleRoot}, so it is already in this process's view — the same view the CLI is
 * spawned into. Translating it would break exactly the containerized case it looks like it helps.
 *
 * @public
 */
export const resolveHookPluginDirs = (
  options: ResolveHookPluginDirsOptions = {},
): readonly string[] => {
  const env = options.env ?? process.env;

  if (!isEnabled(env)) {
    return [];
  }

  const warn =
    options.warn ??
    ((message: string): void => {
      console.warn(message);
    });

  const warnOnce = (message: string): readonly string[] => {
    if (!warned) {
      warned = true;
      warn(`[hook-plugin-injection] ${message}`);
    }
    return [];
  };

  const override = env[HOOK_PLUGIN_DIR_ENV]?.trim();
  if (override !== undefined && override !== '') {
    return isPluginPayload(override)
      ? [override]
      : warnOnce(
          `${HOOK_PLUGIN_DIR_ENV}=${override} has no .claude-plugin/plugin.json; skipping hook injection.`,
        );
  }

  const otRoot = getOpenThrottleRoot(env);
  if (otRoot === undefined) {
    return warnOnce(
      `could not locate the OpenThrottle root; skipping hook injection. Set ${HOOK_PLUGIN_DIR_ENV} to point at the payload.`,
    );
  }

  const payload = path.join(otRoot, OPENTHROTTLE_PLUGIN_DIR_REL);
  return isPluginPayload(payload)
    ? [payload]
    : warnOnce(
        `no plugin payload at ${payload}; skipping hook injection. Run: pnpm nx run @openthrottle/agentic-hooks:bundle-hooks`,
      );
};

/**
 * @description Resets the once-per-process warning latch. Test-only seam.
 * @public
 */
export const resetHookPluginWarning = (): void => {
  warned = false;
};
