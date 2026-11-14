/**
 * @description Attaches the sandboxed MCP (`../sandbox/bin-sandbox.ts`) to one CLI trial. Each driver resolves its
 * executable from an env var (`OPENTHROTTLE_CLAUDE_BIN`, …), so the attachment is a tiny wrapper script installed
 * there that `exec`s the real CLI with the sandbox injected:
 *
 * - **claude**: `--strict-mcp-config --mcp-config <file>`. Strict mode ignores every other MCP source (user,
 *   project, local), so the sandbox is the ONLY server the run sees.
 * - **codex**: `-c mcp_servers.openthrottle-mcp.*` overrides after `exec`. They replace a same-named user-scope
 *   server; the trial cwd is an untrusted temp dir, so no project `.codex/config.toml` loads. They also set
 *   `default_tools_approval_mode = "approve"`: `codex exec` runs with approval policy `never`, under which an MCP
 *   call that needs approval fails before it reaches the server (verified on codex-cli 0.167.0).
 *
 * The driver packages stay untouched: they are workspace-agnostic by design and must not learn about OpenThrottle.
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  CLI_DRIVER_BINARIES,
  SANDBOX_SERVER_NAME,
} from './data/data.cli-drivers.ts';

/**
 * @description A CLI the suite can drive against the sandbox.
 */
export type CliDriverId = keyof typeof CLI_DRIVER_BINARIES;

/**
 * @description How to launch the sandbox server as a stdio MCP child: absolute command, argv and env.
 */
export interface SandboxLaunch {
  readonly args: readonly string[];
  readonly command: string;
  readonly env: Readonly<Record<string, string>>;
}

/**
 * @description Narrows a `--driver` entry to a supported CLI.
 * @public
 */
export function isCliDriverId(value: string): value is CliDriverId {
  return Object.hasOwn(CLI_DRIVER_BINARIES, value);
}

/**
 * @description POSIX single-quote escaping for one shell word.
 * @public
 */
export function shellQuote(word: string): string {
  return `'${word.replaceAll("'", `'\\''`)}'`;
}

/**
 * @description The `--mcp-config` JSON for claude: one stdio server, the sandbox, under the production name.
 * @public
 */
export function claudeSandboxConfig(launch: SandboxLaunch): string {
  return JSON.stringify({
    mcpServers: {
      [SANDBOX_SERVER_NAME]: {
        args: launch.args,
        command: launch.command,
        env: launch.env,
        type: 'stdio',
      },
    },
  });
}

/**
 * @description The `-c key=value` overrides that point codex's `openthrottle-mcp` server at the sandbox. Values
 * are TOML; `JSON.stringify` of a string or string array is valid TOML for both.
 * @public
 */
export function codexSandboxOverrides(launch: SandboxLaunch): string[] {
  const prefix = `mcp_servers.${SANDBOX_SERVER_NAME}`;
  const envTable = Object.entries(launch.env)
    .map(([key, value]) => {
      return `${key}=${JSON.stringify(value)}`;
    })
    .join(',');

  return [
    `${prefix}.command=${JSON.stringify(launch.command)}`,
    `${prefix}.args=${JSON.stringify(launch.args)}`,
    `${prefix}.env={${envTable}}`,
    `${prefix}.default_tools_approval_mode="approve"`,
  ];
}

/**
 * @description The wrapper script for `driverId`. `configPath` is claude's `--mcp-config` file and is ignored for
 * codex. codex's flags go after the subcommand (`exec`), which the driver always passes first.
 * @public
 */
export function sandboxWrapperScript(
  driverId: CliDriverId,
  realBin: string,
  launch: SandboxLaunch,
  configPath: string,
): string {
  if (driverId === 'claude') {
    const flags = ['--strict-mcp-config', '--mcp-config', configPath]
      .map(shellQuote)
      .join(' ');

    return `#!/bin/sh\nexec ${shellQuote(realBin)} ${flags} "$@"\n`;
  }

  const overrides = codexSandboxOverrides(launch)
    .flatMap((override) => {
      return ['-c', shellQuote(override)];
    })
    .join(' ');

  return `#!/bin/sh\nsub="$1"\nshift\nexec ${shellQuote(realBin)} "$sub" ${overrides} "$@"\n`;
}

/**
 * @description Inputs for {@link writeSandboxAttachment}.
 */
export interface WriteSandboxAttachmentOptions {
  readonly dir: string;
  readonly driverId: CliDriverId;
  readonly launch: SandboxLaunch;
  readonly realBin: string;
}

/**
 * @description Writes the wrapper (and claude's config file) into `dir` and returns the env that routes the
 * driver through it. `dir` must be private to the trial and outside the agent's cwd.
 * @public
 */
export async function writeSandboxAttachment(
  options: WriteSandboxAttachmentOptions,
): Promise<Record<string, string>> {
  const { dir, driverId, launch, realBin } = options;
  const configPath = join(dir, 'mcp-config.json');
  const wrapperPath = join(dir, `${driverId}-sandboxed`);

  await Promise.all([
    driverId === 'claude'
      ? writeFile(configPath, claudeSandboxConfig(launch))
      : Promise.resolve(),
    writeFile(
      wrapperPath,
      sandboxWrapperScript(driverId, realBin, launch, configPath),
      { mode: 0o755 },
    ),
  ]);

  return { [CLI_DRIVER_BINARIES[driverId].binEnv]: wrapperPath };
}
