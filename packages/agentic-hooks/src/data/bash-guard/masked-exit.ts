/**
 * Bash-guard rules for commands whose exit status says nothing about the work
 * they wrapped.
 *
 * `masked-exit-trailing` — the last top-level statement is an `echo`/`printf`
 * of `$?`, or a bare `true`/`:` after `;` or `||`. The shell exits with that
 * last statement's status, so `pnpm run check:local; echo exit=$?` exits 0
 * even when nx was killed with 130. An echoed `$?` run in the background is
 * denied: the exit status is all the harness reports. In the foreground the
 * agent can at least read the echoed number, so it warns. A trailing
 * `|| true` / `; true` only ever warns: the transcript replay found a
 * background launch-and-probe script ending in a cosmetic `grep … || true`,
 * which is a false positive for a deny.
 *
 * `masked-exit-pipeline` — a validation command (nx, pnpm run/exec, vitest,
 * tsc, eslint, check:local) piped into `tail`, `head` or `grep` with no
 * `set -o pipefail` before it. A pipeline's status is its last command's, so a
 * failing suite piped into `tail` reports success. Warns.
 *
 * A trailing echo after `&&` is fine (it only runs on success), and a command
 * that finishes with `exit $rc` is fine (the echo is no longer last).
 *
 * @public
 */
import { stripCommandPrefixes } from './shell-words.ts';
import {
  BASH_RULE_ALLOW,
  type BashGuardRule,
  type BashOperator,
  type BashRuleVerdict,
  type BashSegment,
  type ParsedBashCommand,
} from './types.ts';

/** @public */
export const MASKED_EXIT_TRAILING_RULE_ID = 'masked-exit-trailing';

/** @public */
export const MASKED_EXIT_PIPELINE_RULE_ID = 'masked-exit-pipeline';

/** Operators after which the next statement runs whatever came before. */
const UNCONDITIONAL_OR_ON_FAILURE: ReadonlySet<BashOperator> = new Set([
  ';',
  '||',
]);

const PIPES: ReadonlySet<BashOperator | null> = new Set(['|', '|&']);

const ECHOES: ReadonlySet<string> = new Set(['echo', 'printf']);

const NO_OPS: ReadonlySet<string> = new Set([':', 'true']);

const FILTERS: ReadonlySet<string> = new Set(['grep', 'head', 'tail']);

const VALIDATORS: ReadonlySet<string> = new Set([
  'eslint',
  'nx',
  'tsc',
  'vitest',
]);

const PNPM_VALIDATING_SUBCOMMANDS: ReadonlySet<string> = new Set([
  'exec',
  'nx',
  'run',
  ...VALIDATORS,
]);

const LAST_STATUS = /\$(\?|\{\?\})/;

const SUGGESTED_TRAILER = '`cmd; rc=$?; echo exit=$rc; exit $rc`';

const bareWords = (segment: BashSegment): readonly string[] => {
  return stripCommandPrefixes(segment.words).words;
};

interface TrailingMask {
  /** @description Whether the rule may deny it when run in the background. */
  readonly isDeniable: boolean;
  readonly what: string;
}

const describeTrailing = (segment: BashSegment): TrailingMask | null => {
  const [head, ...rest] = bareWords(segment);
  if (head === undefined) return null;
  const isAfterAnything =
    segment.precededBy !== null &&
    UNCONDITIONAL_OR_ON_FAILURE.has(segment.precededBy);
  if (!isAfterAnything) return null;
  if (ECHOES.has(head) && rest.some((word) => LAST_STATUS.test(word))) {
    return { isDeniable: true, what: `ends with \`${head} … $?\`` };
  }
  if (NO_OPS.has(head) && rest.length === 0) {
    const what = `ends with \`${segment.precededBy} ${head}\``;
    return { isDeniable: false, what };
  }
  return null;
};

const trailingReason = (what: string, background: boolean): string => {
  const consequence = background
    ? 'It runs in the background, where that exit status is the only result anyone sees.'
    : 'Only you can read the echoed number; the harness records success.';
  return [
    `This command ${what}, so the shell exits 0 whatever the work before it did.`,
    consequence,
    `Keep the status: ${SUGGESTED_TRAILER}.`,
  ].join(' ');
};

const evaluateTrailing = async (
  command: ParsedBashCommand,
  context: Parameters<BashGuardRule['evaluate']>[1],
): Promise<BashRuleVerdict> => {
  const last = command.segments.at(-1);
  if (last === undefined || command.segments.length < 2) {
    return BASH_RULE_ALLOW;
  }
  const mask = describeTrailing(last);
  if (mask === null) return BASH_RULE_ALLOW;
  const reason = trailingReason(mask.what, context.background);
  const isDenied = context.background && mask.isDeniable;
  return isDenied ? { decision: 'deny', reason } : { decision: 'warn', reason };
};

/** @public */
export const maskedExitTrailingRule: BashGuardRule = {
  evaluate: evaluateTrailing,
  id: MASKED_EXIT_TRAILING_RULE_ID,
};

const isValidation = (segment: BashSegment): boolean => {
  const words = bareWords(segment);
  if (words.some((word) => word.includes('check:local'))) return true;
  const [head, sub] = words;
  if (head === undefined) return false;
  if (VALIDATORS.has(head)) return true;
  const isRunner = head === 'pnpm' || head === 'npx';
  return isRunner && sub !== undefined && PNPM_VALIDATING_SUBCOMMANDS.has(sub);
};

const enablesPipefail = (segment: BashSegment): boolean => {
  const [head, ...rest] = bareWords(segment);
  if (head === 'setopt') return rest.includes('pipefail');
  if (head !== 'set') return false;
  const index = rest.indexOf('pipefail');
  const flag = index > 0 ? rest[index - 1] : undefined;
  return flag !== undefined && /^-[a-z]*o$/.test(flag);
};

/** The filter a validation at `index` is piped into, or null. */
const filterAfter = (
  segments: readonly BashSegment[],
  index: number,
): string | null => {
  for (const segment of segments.slice(index + 1)) {
    if (!PIPES.has(segment.precededBy)) return null;
    const head = bareWords(segment)[0];
    if (head !== undefined && FILTERS.has(head)) return head;
  }
  return null;
};

const evaluatePipeline = async (
  command: ParsedBashCommand,
): Promise<BashRuleVerdict> => {
  if (!/\|/.test(command.raw)) return BASH_RULE_ALLOW;
  const { segments } = command;
  const pipefailAt = segments.findIndex(enablesPipefail);
  const hit = segments.findIndex((segment, index) => {
    const isGuarded = pipefailAt !== -1 && pipefailAt < index;
    return !isGuarded && isValidation(segment) && filterAfter(segments, index);
  });
  const segment = segments[hit];
  if (segment === undefined) return BASH_RULE_ALLOW;
  const filter = filterAfter(segments, hit) ?? 'a filter';
  const reason = [
    `\`${bareWords(segment).slice(0, 3).join(' ')}\` is piped into \`${filter}\`, so the pipeline exits with \`${filter}\`'s status, not the validation's.`,
    'Prefix the command with `set -o pipefail;` (bash and zsh) before reporting it as passing.',
  ].join(' ');
  return { decision: 'warn', reason };
};

/** @public */
export const maskedExitPipelineRule: BashGuardRule = {
  evaluate: evaluatePipeline,
  id: MASKED_EXIT_PIPELINE_RULE_ID,
};
