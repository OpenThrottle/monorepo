#!/usr/bin/env node
/**
 * @description `pnpm run voice:start` / `voice:stop` / `voice:logs`, worktree-aware.
 *
 * The primary checkout (no `OT_WORKTREE_DB` marker) runs EXACTLY the commands the
 * package.json scripts used to inline — `docker compose --profile voice up -d
 * --wait whisper` and friends — streamed straight to the terminal.
 *
 * Every linked worktree (`OT_WORKTREE_DB=shared` OR `isolated`) SHARES the
 * primary's whisper, whatever its database mode:
 *  - The service is stateless per session (the model is chosen per client in the
 *    JSON config frame), so a branch never needs its own.
 *  - Its model cache is a named volume, which compose scopes per project: a
 *    worktree's own container would start with an empty cache and re-download.
 *  - `WHISPER_PORT` / `WHISPER_SERVICE_URL` are not in the worktree port block,
 *    so a worktree's `.env` already points the server at the primary's `:6030` —
 *    and a second container under the worktree's compose project fails with
 *    `Bind for 0.0.0.0:6030 failed: port is already allocated`.
 *
 * So in a worktree:
 *  - start: `up -d --wait whisper` against the PRIMARY's compose file, project
 *    directory and project. Compose makes that idempotent — a healthy container
 *    is left alone, a stopped one is started — and it needs no port probe (a bare
 *    TCP connect makes WhisperLive log a traceback; see its healthcheck).
 *  - stop: never stops the shared container.
 *  - logs: follows the primary's container.
 *
 * Runs under bare Node (native type stripping), dependency-free.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolvePrimaryComposeProject } from './openthrottle-database-lifecycle.ts';
import { readEnvFile } from './utils/env.ts';
import { primaryCheckoutDir } from './utils/git.ts';
import { createLogger } from './utils/logger.ts';
import type { WorktreeDbMode } from './utils/worktree-db.ts';
import { resolveWorktreeDbMode, WORKTREE_DB_ENV_KEY } from './utils/worktree-db.ts'; // prettier-ignore

const logger = createLogger();

export type VoiceAction = 'logs' | 'start' | 'stop';

/** What a voice action turns into. Pure data, so the decision is unit-testable. */
export type VoicePlan =
  /** Run `docker compose <args>` in this checkout, as the inline scripts always did. */
  | { readonly args: readonly string[]; readonly kind: 'own-compose' }
  /** Run `docker compose <args>` against the PRIMARY's compose project. */
  | { readonly kind: 'shared-primary'; readonly tail: readonly string[] }
  /** Never stop the shared whisper. */
  | { readonly kind: 'shared-stop-skipped' };

/** The compose arguments after `--profile voice`, per action. */
const VOICE_ACTION_ARGS: Record<VoiceAction, readonly string[]> = {
  logs: ['logs', 'whisper', '-f'],
  start: ['up', '-d', '--wait', 'whisper'],
  stop: ['stop', 'whisper'],
};

/** The compose arguments the primary checkout always ran. */
export const OWN_VOICE_COMPOSE_ARGS: Record<VoiceAction, readonly string[]> = {
  logs: ['compose', '--profile', 'voice', ...VOICE_ACTION_ARGS.logs],
  start: ['compose', '--profile', 'voice', ...VOICE_ACTION_ARGS.start],
  stop: ['compose', '--profile', 'voice', ...VOICE_ACTION_ARGS.stop],
};

/**
 * Decide what to do. Only the primary owns whisper; any worktree, shared OR
 * isolated database, uses the primary's.
 */
export const planVoiceAction = (
  action: VoiceAction,
  mode: WorktreeDbMode,
): VoicePlan => {
  if (mode === 'primary') {
    return { args: OWN_VOICE_COMPOSE_ARGS[action], kind: 'own-compose' };
  }

  if (action === 'stop') {
    return { kind: 'shared-stop-skipped' };
  }

  return { kind: 'shared-primary', tail: VOICE_ACTION_ARGS[action] };
};

/** `docker compose` arguments pinned to the primary's file, directory and project. */
export const primaryVoiceArgs = (
  primaryDir: string,
  project: string,
  tail: readonly string[],
): string[] => {
  return [
    'compose',
    '-f',
    join(primaryDir, 'docker-compose.yml'),
    '--project-directory',
    primaryDir,
    '-p',
    project,
    '--profile',
    'voice',
    ...tail,
  ];
};

const dockerCompose = (args: readonly string[]): number => {
  const outcome = spawnSync('docker', [...args], { stdio: 'inherit' });

  if (outcome.error) {
    logger.fail(`docker failed to start: ${outcome.error.message}`);

    return 1;
  }

  return outcome.status ?? 1;
};

/** Run one voice action for the checkout at `cwd`; returns the process exit code. */
export const runVoiceAction = (action: VoiceAction, cwd: string): number => {
  const envFile = readEnvFile(join(cwd, '.env'));
  const mode = resolveWorktreeDbMode(
    process.env[WORKTREE_DB_ENV_KEY] ?? envFile[WORKTREE_DB_ENV_KEY],
  );
  const plan = planVoiceAction(action, mode);

  if (plan.kind === 'own-compose') {
    return dockerCompose(plan.args);
  }

  const primaryDir = primaryCheckoutDir(cwd);

  if (primaryDir === undefined) {
    logger.fail(`${WORKTREE_DB_ENV_KEY}=${mode} but the primary checkout could not be resolved (git rev-parse --git-common-dir)`); // prettier-ignore

    return 1;
  }

  if (plan.kind === 'shared-stop-skipped') {
    logger.info(`voice:stop skipped: worktrees share the primary's whisper (${primaryDir}); stop it from there`); // prettier-ignore

    return 0;
  }

  const composeFile = join(primaryDir, 'docker-compose.yml');
  const composeContents = existsSync(composeFile) ? readFileSync(composeFile, 'utf8') : ''; // prettier-ignore

  if (!/^ {2}whisper:/m.test(composeContents)) {
    logger.fail(`worktrees share the primary's whisper, but ${composeFile} declares no whisper service (is the primary on an older branch?)`); // prettier-ignore

    return 1;
  }

  const project = resolvePrimaryComposeProject({
    composeContents,
    primaryDir,
    primaryEnv: readEnvFile(join(primaryDir, '.env')),
  });

  logger.info(`worktrees share the primary's whisper: running ${action} against project ${project} (${primaryDir})`); // prettier-ignore

  return dockerCompose(primaryVoiceArgs(primaryDir, project, plan.tail));
};

/** Narrow a CLI argument to a voice action. */
export const parseVoiceAction = (
  value: string | undefined,
): VoiceAction | undefined => {
  return value === 'start' || value === 'stop' || value === 'logs'
    ? value
    : undefined;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const action = parseVoiceAction(process.argv[2]);

  if (action === undefined) {
    logger.fail('usage: openthrottle-voice-lifecycle.ts <start|stop|logs>');
    process.exitCode = 2;
  } else {
    process.exitCode = runVoiceAction(action, process.cwd());
  }
}
