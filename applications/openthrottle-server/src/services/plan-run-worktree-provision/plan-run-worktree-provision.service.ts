/**
 * @description Provisions the git worktree a programmatic plan run executes in, through the ONE
 * sanctioned entrypoint `pnpm run worktree:new <name>` (`scripts/create_worktree.sh`) — never a bare
 * `git worktree add`, which skips port allocation and `.env` provisioning and only self-heals on the
 * first `:dev`. Idempotent: an existing worktree for the run's name is reused, never recreated.
 *
 * Fails fast. A silent fallback to the process cwd would drop the agent into the primary checkout,
 * which is the bug this exists to fix. See docs/openthrottle/plan-run-worktrees.md.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';

const execFileAsync = promisify(execFile);

/** Provisioning runs `setup_worktree.sh` (install + codegen); give it room before giving up. */
const PROVISION_TIMEOUT_MS = 20 * 60 * 1000;

const PROVISION_MAX_BUFFER_BYTES = 16 * 1024 * 1024;

export interface ProvisionPlanRunWorktreeParams {
  /** Absolute path of the checkout the worktree is created from. */
  readonly baseCheckoutPath: string;
  /** Worktree name (also the branch, as `openthrottle/<name>`). */
  readonly worktreeName: string;
  /** Configured worktree root, forwarded as `OT_WORKTREE_ROOT`; null uses the script's default. */
  readonly worktreeRoot?: string | null;
}

@Injectable()
export class PlanRunWorktreeProvisionService {
  private readonly name = 'plan-run-worktree-provision';

  /** Serializes provisioning per target so two runs cannot race on the same worktree name. */
  private readonly inFlight = new Map<string, Promise<string>>();

  constructor(private readonly logger: LoggerService) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Returns the absolute path of the run's worktree, creating it when missing.
   * @throws Error when the worktree cannot be created — the caller must fail the run rather than
   * fall back to the base checkout.
   */
  async provision(params: ProvisionPlanRunWorktreeParams): Promise<string> {
    const { baseCheckoutPath, worktreeName } = params;
    const key = `${baseCheckoutPath}::${worktreeName}`;

    const pending = this.inFlight.get(key);
    if (pending !== undefined) {
      return pending;
    }

    const work = this.resolveOrCreate(params).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, work);
    return work;
  }

  /**
   * @description Reuses an existing linked worktree for the name, otherwise creates one.
   */
  private async resolveOrCreate(
    params: ProvisionPlanRunWorktreeParams,
  ): Promise<string> {
    const { baseCheckoutPath, worktreeName } = params;

    const existing = await this.findExistingWorktree(
      baseCheckoutPath,
      worktreeName,
    );
    if (existing !== null) {
      this.logger.log(
        `[${this.name}] reusing worktree ${worktreeName} at ${existing}`,
      );
      return existing;
    }

    return this.createWorktree(params);
  }

  /**
   * @description Absolute path of the worktree whose directory is named `worktreeName`, or null.
   * Reads `git worktree list --porcelain` from the base checkout, which sees every linked worktree
   * of the repository regardless of the root they live under.
   */
  private async findExistingWorktree(
    baseCheckoutPath: string,
    worktreeName: string,
  ): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['-C', baseCheckoutPath, 'worktree', 'list', '--porcelain'],
        { maxBuffer: PROVISION_MAX_BUFFER_BYTES },
      );

      const paths = stdout
        .split('\n')
        .filter((line) => line.startsWith('worktree '))
        .map((line) => line.slice('worktree '.length).trim());

      return (
        paths.find((path) => path.split('/').pop() === worktreeName) ?? null
      );
    } catch (error) {
      this.logger.warn(
        `[${this.name}] could not list worktrees in ${baseCheckoutPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  /**
   * @description Runs `pnpm run worktree:new <name>` and returns the absolute path it prints. The
   * script's contract is that stdout carries ONLY that path.
   */
  private async createWorktree(
    params: ProvisionPlanRunWorktreeParams,
  ): Promise<string> {
    const { baseCheckoutPath, worktreeName, worktreeRoot } = params;
    const root = worktreeRoot?.trim();

    this.logger.log(
      `[${this.name}] creating worktree ${worktreeName} from ${baseCheckoutPath}${
        root !== undefined && root !== '' ? ` under ${root}` : ''
      }`,
    );

    try {
      const { stdout } = await execFileAsync(
        'pnpm',
        ['run', 'worktree:new', worktreeName],
        {
          cwd: baseCheckoutPath,
          env: {
            ...process.env,
            ...(root !== undefined && root !== ''
              ? { OT_WORKTREE_ROOT: root }
              : {}),
          },
          maxBuffer: PROVISION_MAX_BUFFER_BYTES,
          timeout: PROVISION_TIMEOUT_MS,
        },
      );

      const path = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('/'))
        .pop();

      if (path === undefined) {
        throw new Error(
          `worktree:new printed no worktree path (stdout: ${stdout.trim().slice(-500)})`,
        );
      }

      this.logger.log(`[${this.name}] worktree ${worktreeName} at ${path}`);
      return path;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const stderr =
        typeof error === 'object' &&
        error !== null &&
        'stderr' in error &&
        typeof error.stderr === 'string'
          ? error.stderr.trim().slice(-2000)
          : '';

      throw new Error(
        `Failed to provision worktree "${worktreeName}" from ${baseCheckoutPath}: ${detail}${
          stderr === '' ? '' : `\n${stderr}`
        }`,
      );
    }
  }
}
