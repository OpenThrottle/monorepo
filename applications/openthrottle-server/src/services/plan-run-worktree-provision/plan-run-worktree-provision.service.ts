/**
 * @description Provisions the git worktree a programmatic plan run executes in, through the ONE
 * sanctioned entrypoint: the ot-worktree **create** action (`skills/ot-worktree/scripts/create.sh`),
 * exec'd by absolute path with cwd = the base checkout — never a bare `git worktree add`, which
 * skips the repo's provisioner, and never `pnpm run worktree:new`, which is only the OpenThrottle
 * monorepo's own alias and does not exist in a foreign repo. The script is found by
 * {@link resolveOtWorktreeScript}, whose last rung is the server's own copy, so a foreign repo needs
 * nothing installed. Idempotent: an existing worktree for the run's name is reused, never recreated.
 *
 * Fails fast. A silent fallback to the process cwd would drop the agent into the primary checkout,
 * which is the bug this exists to fix. See docs/openthrottle/plan-run-worktrees.md.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';

import { OT_WORKTREE_ACTION } from '../ot-worktree-script/ot-worktree-script.constants.ts';
import { resolveOtWorktreeScript } from '../ot-worktree-script/ot-worktree-script.utils.ts';
import { resolveWorktreeRoot } from '../worktree-root/worktree-root.utils.ts';
import type { ProvisionPlanRunWorktreeParams } from './plan-run-worktree-provision.types.ts';

const execFileAsync = promisify(execFile);

/** Provisioning runs `setup_worktree.ts` (install + codegen); give it room before giving up. */
const PROVISION_TIMEOUT_MS = 20 * 60 * 1000;

const PROVISION_MAX_BUFFER_BYTES = 16 * 1024 * 1024;
const readStderrTail = (error: unknown): string => {
  if (typeof error !== 'object' || error === null) return '';
  if (!('stderr' in error)) return '';
  if (typeof error.stderr !== 'string') return '';
  return error.stderr.trim().slice(-2000);
};

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
   * @description Runs the resolved `create.sh <name>` and returns the absolute path it prints. The
   * script's contract is that stdout carries ONLY that path.
   */
  private async createWorktree(
    params: ProvisionPlanRunWorktreeParams,
  ): Promise<string> {
    const { baseCheckoutPath, worktreeName } = params;

    // The script owns root resolution end to end: it reads OPENTHROTTLE_WORKTREE_ROOT from this process's
    // environment (which the child inherits), then the target repo's .env, then its default. Nothing
    // is forwarded here — a second channel is exactly what used to let the server and the CLI
    // disagree. The shared ladder is still consulted so the log names the directory discovery will
    // look in.
    const resolved = this.describeResolvedRoot(baseCheckoutPath);

    const script = resolveOtWorktreeScript({
      action: OT_WORKTREE_ACTION.CREATE,
      baseCheckoutPath,
      env: process.env,
    });
    if (!script.ok) {
      throw new Error(
        `Failed to provision worktree "${worktreeName}" from ${baseCheckoutPath}: no ot-worktree ` +
          `create.sh found. Searched, in order:\n${script.searched
            .map((path) => `  - ${path}`)
            .join('\n')}`,
      );
    }

    this.logger.log(
      `[${this.name}] creating worktree ${worktreeName} from ${baseCheckoutPath}${
        resolved === null ? '' : ` under ${resolved}`
      } via ${script.scriptPath} (rung: ${script.rung})`,
    );

    try {
      const { stdout } = await execFileAsync(
        'bash',
        [script.scriptPath, worktreeName],
        {
          cwd: baseCheckoutPath,
          env: process.env,
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
          `ot-worktree create printed no worktree path (stdout: ${stdout.trim().slice(-500)})`,
        );
      }

      this.logger.log(`[${this.name}] worktree ${worktreeName} at ${path}`);
      return path;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const stderr = readStderrTail(error);

      throw new Error(
        `Failed to provision worktree "${worktreeName}" from ${baseCheckoutPath}: ${detail}${
          stderr === '' ? '' : `\n${stderr}`
        }`,
      );
    }
  }

  /**
   * @description The directory the shared ladder says the worktree will land under, for the log
   * line only — never forwarded to the script. Soft-fails to null so a misconfigured root surfaces
   * from the script (the one entrypoint) rather than from a log helper.
   */
  private describeResolvedRoot(baseCheckoutPath: string): string | null {
    try {
      return resolveWorktreeRoot({ baseCheckoutPath }).resolvedRoot;
    } catch {
      return null;
    }
  }
}
