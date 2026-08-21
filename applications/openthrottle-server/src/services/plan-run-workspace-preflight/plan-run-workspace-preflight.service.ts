/**
 * @description Preflights the directory a programmatic plan run is about to execute in, so a run
 * that cannot reach its MCP servers says so instead of reporting a false success.
 *
 * Worktree-by-default (this plan) multiplies how often a run starts in a path the agent CLI has
 * never seen, and the two historical failure modes are both silent:
 *
 * - a missing or stale `.env` shows up as an interactive **password prompt**, not an error;
 * - a workspace MCP entry launched by a RELATIVE command (`bash ./scripts/run-*.sh`) is *discovered*
 *   by the CLI walking up to the workspace root but *spawned* with the process cwd, so it fails to
 *   connect from anywhere but the repo root (the residual half of the run-479b58d1 bug).
 *
 * The diagnostic split matters: a run whose tool catalog is missing the OT tools while other servers
 * attach is an approval/cwd problem, never an auth problem.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';

/**
 * Workspace MCP config each backend reads, relative to the run directory. Only the two backends a
 * queued run can use are listed: cursor parses `.cursor/mcp.json` (and needs `--approve-mcps`, which
 * the driver emits via its `mcpAutoApprove` capability), claude attaches `.mcp.json` on its own. The
 * remaining CLIs read user-scope config the checkout cannot influence, so there is nothing here to
 * check for them.
 */
const MCP_CONFIG_BY_BACKEND: Partial<Record<WorkflowConfigRunner, string>> = {
  claude: '.mcp.json',
  cursor: '.cursor/mcp.json',
};

/** The MCP server whose absence makes a plan run pointless: it is how the agent reads/writes OT. */
const REQUIRED_MCP_SERVER = 'openthrottle-mcp';

export interface PlanRunWorkspacePreflightParams {
  readonly backend: WorkflowConfigRunner;
  /** Absolute path of the directory the agent will run in (the run's worktree). */
  readonly workingDirectory: string;
}

@Injectable()
export class PlanRunWorkspacePreflightService {
  private readonly name = 'plan-run-workspace-preflight';

  constructor(private readonly logger: LoggerService) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Returns one human-readable warning per problem found, empty when the directory
   * looks usable. Never throws: a preflight that cannot read the workspace must not fail the run.
   */
  check(params: PlanRunWorkspacePreflightParams): readonly string[] {
    const { backend, workingDirectory } = params;

    if (!isAbsolute(workingDirectory) || !existsSync(workingDirectory)) {
      return [
        `Run directory ${workingDirectory} does not exist; the agent cannot reach any workspace MCP server from it.`,
      ];
    }

    return [
      ...this.checkEnvFile(workingDirectory),
      ...this.checkMcpConfig(backend, workingDirectory),
    ];
  }

  /**
   * @description A fresh worktree without a provisioned `.env` is the "password prompt instead of an
   * error" trap — `worktree:new` writes one, a bare `git worktree add` does not.
   */
  private checkEnvFile(workingDirectory: string): readonly string[] {
    const envPath = join(workingDirectory, '.env');

    if (!existsSync(envPath)) {
      return [
        `No .env in ${workingDirectory}. A worktree created outside \`pnpm run worktree:new\` is not provisioned; expect credential prompts rather than a clean failure.`,
      ];
    }

    try {
      if (statSync(envPath).size === 0) {
        return [
          `.env in ${workingDirectory} is empty; the run has no credentials.`,
        ];
      }
    } catch {
      return [`.env in ${workingDirectory} could not be read.`];
    }

    return [];
  }

  /**
   * @description Checks the backend's workspace MCP config exists, names `openthrottle-mcp`, and
   * that every relatively-launched server's launcher actually resolves from THIS directory.
   */
  private checkMcpConfig(
    backend: WorkflowConfigRunner,
    workingDirectory: string,
  ): readonly string[] {
    const relativeConfigPath = MCP_CONFIG_BY_BACKEND[backend];
    if (relativeConfigPath === undefined) {
      // Nothing in the checkout affects this CLI's MCP catalog; silence beats a warning it cannot act on.
      return [];
    }

    const configPath = join(workingDirectory, relativeConfigPath);

    if (!existsSync(configPath)) {
      return [
        `No ${relativeConfigPath} in ${workingDirectory}; the ${backend} agent will run with no workspace MCP servers, so ${REQUIRED_MCP_SERVER} tools will be missing.`,
      ];
    }

    let servers: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(readFileSync(configPath, 'utf8'));
      const candidate =
        typeof parsed === 'object' && parsed !== null && 'mcpServers' in parsed
          ? parsed.mcpServers
          : undefined;
      servers =
        typeof candidate === 'object' && candidate !== null
          ? { ...candidate }
          : {};
    } catch (error) {
      return [
        `${relativeConfigPath} in ${workingDirectory} is not readable JSON (${
          error instanceof Error ? error.message : String(error)
        }); MCP servers will not attach.`,
      ];
    }

    const warnings: string[] = [];

    if (!(REQUIRED_MCP_SERVER in servers)) {
      warnings.push(
        `${relativeConfigPath} in ${workingDirectory} does not define ${REQUIRED_MCP_SERVER}; the run cannot read or update its plan.`,
      );
    }

    for (const [serverName, definition] of Object.entries(servers)) {
      const launcher = resolveRelativeLauncher(definition);
      if (launcher === null) continue;

      if (!existsSync(join(workingDirectory, launcher))) {
        warnings.push(
          `MCP server "${serverName}" launches ${launcher}, which does not exist under ${workingDirectory}. The CLI discovers the config by walking up but SPAWNS with this cwd, so the server will report a connection failure — an approval/cwd problem, not an auth problem.`,
        );
      }
    }

    return warnings;
  }
}

/**
 * @description The relative launcher path an MCP server definition runs (`./scripts/run-x.sh`), or
 * null when it launches something absolute or off PATH that this check cannot verify.
 */
const resolveRelativeLauncher = (definition: unknown): string | null => {
  if (typeof definition !== 'object' || definition === null) return null;
  if (!('args' in definition)) return null;

  const { args } = definition;
  if (!Array.isArray(args)) return null;

  const relative = args.find(
    (arg): arg is string => typeof arg === 'string' && arg.startsWith('./'),
  );

  return relative ?? null;
};
