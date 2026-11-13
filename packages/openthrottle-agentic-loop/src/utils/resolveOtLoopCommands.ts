import { join } from 'node:path';

import type {
  OtLoopTuning,
  ResolveOtLoopCommandsResult,
  ResolverFs,
} from '../contract/index.ts';
import {
  FALLBACK_RUNNER,
  LOCKFILE_RUNNERS,
  NX_DEFAULT_TARGETS,
  OT_LOOP_CONFIG_PATH,
  OT_LOOP_NEEDS_VALIDATION_MESSAGE,
} from '../data/data.constants.ts';

export interface ResolveOtLoopCommandsInput {
  readonly fs: ResolverFs;
  readonly otLoop: OtLoopTuning | undefined;
  readonly worktreeRoot: string;
}

interface RepoConfig {
  readonly finalValidation: readonly string[];
  readonly setup: readonly string[];
  readonly validation: readonly string[] | undefined;
}

type ConfigRead =
  | { readonly config: RepoConfig | undefined; readonly kind: 'ok' }
  | { readonly kind: 'invalid'; readonly message: string };

type CommandsRead =
  | { readonly commands: readonly string[] | undefined; readonly kind: 'ok' }
  | { readonly kind: 'invalid'; readonly message: string };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isCommand = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim() !== '';
};

const invalid = (detail: string): { kind: 'invalid'; message: string } => {
  return {
    kind: 'invalid',
    message: `${OT_LOOP_CONFIG_PATH} is invalid: ${detail}`,
  };
};

const readCommands = (section: unknown, name: string): CommandsRead => {
  if (section === undefined) {
    return { commands: undefined, kind: 'ok' };
  }

  if (!isRecord(section)) {
    return invalid(`"${name}" must be an object with a "commands" array`);
  }

  const commands = section['commands'];

  if (commands === undefined) {
    return { commands: undefined, kind: 'ok' };
  }

  if (!Array.isArray(commands) || !commands.every(isCommand)) {
    return invalid(`"${name}.commands" must be an array of non-empty strings`);
  }

  return { commands, kind: 'ok' };
};

const parseRepoConfig = (raw: string): ConfigRead => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return invalid(
      `not valid JSON (${error instanceof Error ? error.message : 'parse error'})`,
    );
  }

  if (!isRecord(parsed)) {
    return invalid('the top level must be a JSON object');
  }

  const validation = readCommands(parsed['validation'], 'validation');
  const setup = readCommands(parsed['setup'], 'setup');
  const finalValidation = readCommands(
    parsed['finalValidation'],
    'finalValidation',
  );

  for (const read of [validation, setup, finalValidation]) {
    if (read.kind === 'invalid') {
      return read;
    }
  }

  if (
    validation.kind !== 'ok' ||
    setup.kind !== 'ok' ||
    finalValidation.kind !== 'ok'
  ) {
    return invalid('unreadable section');
  }

  if (validation.commands?.length === 0) {
    return invalid(
      `"validation.commands" must not be empty: validation is never skipped`,
    );
  }

  return {
    config: {
      finalValidation: finalValidation.commands ?? [],
      setup: setup.commands ?? [],
      validation: validation.commands,
    },
    kind: 'ok',
  };
};

const readRepoConfig = async (
  input: ResolveOtLoopCommandsInput,
): Promise<ConfigRead> => {
  try {
    const raw = await input.fs.readFile(
      join(input.worktreeRoot, OT_LOOP_CONFIG_PATH),
    );

    return raw === undefined
      ? { config: undefined, kind: 'ok' }
      : parseRepoConfig(raw);
  } catch (error) {
    return invalid(
      `could not be read (${error instanceof Error ? error.message : 'read error'})`,
    );
  }
};

const detectRunner = async (
  input: ResolveOtLoopCommandsInput,
): Promise<string> => {
  const found = await Promise.all(
    LOCKFILE_RUNNERS.map((entry) => {
      return input.fs.exists(join(input.worktreeRoot, entry.file));
    }),
  );
  const index = found.indexOf(true);

  return LOCKFILE_RUNNERS[index]?.runner ?? FALLBACK_RUNNER;
};

const nxDefaultCommands = async (
  input: ResolveOtLoopCommandsInput,
): Promise<readonly string[] | undefined> => {
  const hasNx = await input.fs.exists(join(input.worktreeRoot, 'nx.json'));

  if (!hasNx) {
    return undefined;
  }

  const runner = await detectRunner(input);

  return NX_DEFAULT_TARGETS.map((target) => {
    return `${runner} nx affected -t ${target} --base={taskStartSha} --parallel=1`;
  });
};

/**
 * @description Resolves what to run for setup, per-task validation and final validation (§ 6).
 * Validation: plan `otLoop.validationCommands`, then the committed `.openthrottle/ot-loop.json`,
 * then the Nx default when `nx.json` exists, else `none`. Setup and final validation come only
 * from the file. A malformed file yields `invalid`, never a throw.
 * @public
 */
export const resolveOtLoopCommands = async (
  input: ResolveOtLoopCommandsInput,
): Promise<ResolveOtLoopCommandsResult> => {
  const read = await readRepoConfig(input);

  if (read.kind === 'invalid') {
    return read;
  }

  const setup = read.config?.setup ?? [];
  const finalValidation = read.config?.finalValidation ?? [];
  const planCommands = input.otLoop?.validationCommands;

  if (planCommands !== undefined && planCommands.length > 0) {
    return {
      finalValidation,
      kind: 'resolved',
      setup,
      source: 'plan',
      validation: planCommands,
    };
  }

  if (read.config?.validation !== undefined) {
    return {
      finalValidation,
      kind: 'resolved',
      setup,
      source: 'repo-file',
      validation: read.config.validation,
    };
  }

  const nxCommands = await nxDefaultCommands(input);

  if (nxCommands === undefined) {
    return { kind: 'none', message: OT_LOOP_NEEDS_VALIDATION_MESSAGE };
  }

  return {
    finalValidation,
    kind: 'resolved',
    setup,
    source: 'nx-default',
    validation: nxCommands,
  };
};
