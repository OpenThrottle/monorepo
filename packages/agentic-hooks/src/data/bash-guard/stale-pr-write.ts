/**
 * Bash-guard rule `stale-pr-write`: refuse a GitHub CLI pull-request write on a
 * PR that is already MERGED or CLOSED.
 *
 * The failure it exists for: `gh pr view 661 --json state && gh pr comment 661
 * --body …`, meant as "confirm it is open, then comment". The view printed
 * MERGED, but `&&` only checks the exit code, so the comment landed on a merged
 * PR. This rule asks GitHub for the state itself, before the command runs.
 *
 * Only `comment`, `merge`, `close`, `edit`, `review` and `ready` are guarded.
 * `reopen` and every read-only subcommand pass untouched. Anything this rule
 * cannot read with confidence — an unknown flag, a `$VAR` selector, an
 * unresolvable directory, a lookup that fails or runs out of time — allows.
 *
 * @public
 */
import { logHookError } from '../../utils/logging.ts';
import { stripCommandPrefixes } from './shell-words.ts';
import {
  BASH_RULE_ALLOW,
  type BashGuardContext,
  type BashGuardRule,
  type BashRuleVerdict,
  type BashSegment,
  type PullRequestQuery,
  type PullRequestState,
} from './types.ts';

/** @public */
export const STALE_PR_WRITE_RULE_ID = 'stale-pr-write';

/**
 * Flags that take a value, per guarded subcommand, as listed by `gh pr <sub>
 * --help` (gh 2.102). `-R/--repo` is inherited by all of them.
 */
const VALUE_FLAGS: Readonly<Record<string, ReadonlySet<string>>> = {
  close: new Set(['-c', '--comment']),
  comment: new Set(['--attach', '-b', '--body', '-F', '--body-file']),
  edit: new Set([
    '--add-assignee',
    '--add-label',
    '--add-project',
    '--add-reviewer',
    '--attach',
    '-B',
    '--base',
    '-b',
    '--body',
    '-F',
    '--body-file',
    '-m',
    '--milestone',
    '--remove-assignee',
    '--remove-label',
    '--remove-project',
    '--remove-reviewer',
    '-t',
    '--title',
  ]),
  merge: new Set([
    '-A',
    '--author-email',
    '-b',
    '--body',
    '-F',
    '--body-file',
    '--match-head-commit',
    '-t',
    '--subject',
  ]),
  ready: new Set([]),
  review: new Set(['-b', '--body', '-F', '--body-file']),
};

/** Flags that take no value, per guarded subcommand (same source). */
const BOOLEAN_FLAGS: Readonly<Record<string, ReadonlySet<string>>> = {
  close: new Set(['-d', '--delete-branch']),
  comment: new Set([
    '--create-if-none',
    '--delete-last',
    '--edit-last',
    '-e',
    '--editor',
    '-w',
    '--web',
    '--yes',
  ]),
  edit: new Set(['--remove-milestone']),
  merge: new Set([
    '--admin',
    '--auto',
    '-d',
    '--delete-branch',
    '--disable-auto',
    '-m',
    '--merge',
    '-r',
    '--rebase',
    '-s',
    '--squash',
  ]),
  ready: new Set(['--undo']),
  review: new Set([
    '-a',
    '--approve',
    '-c',
    '--comment',
    '-r',
    '--request-changes',
  ]),
};

const REPO_FLAGS: ReadonlySet<string> = new Set(['-R', '--repo']);

const TERMINAL_STATES: ReadonlySet<string> = new Set(['CLOSED', 'MERGED']);

/**
 * What one simple command is, as far as this rule cares: not a guarded write,
 * a guarded write this rule could not read with confidence, or a guarded write
 * with its target.
 *
 * @public
 */
export type GhPrWrite =
  | { readonly kind: 'none' }
  | { readonly kind: 'unparseable' }
  | {
      readonly kind: 'write';
      readonly repo: string | null;
      readonly selector: string | null;
      readonly subcommand: string;
    };

const NONE: GhPrWrite = { kind: 'none' };
const UNPARSEABLE: GhPrWrite = { kind: 'unparseable' };

const isGhBinary = (word: string | undefined): boolean => {
  return word === 'gh' || (word?.endsWith('/gh') ?? false);
};

const isDynamic = (word: string): boolean => {
  return word.includes('$') || word.includes('`');
};

/**
 * Read one simple command's words as a guarded `gh pr` write.
 *
 * @public
 */
export const parseGhPrWrite = (rawWords: readonly string[]): GhPrWrite => {
  const { assignments, words } = stripCommandPrefixes(rawWords);
  if (!isGhBinary(words[0]) || words[1] !== 'pr') return NONE;

  const subcommand = words[2] ?? '';
  const valueFlags = VALUE_FLAGS[subcommand];
  const booleanFlags = BOOLEAN_FLAGS[subcommand];
  if (valueFlags === undefined || booleanFlags === undefined) return NONE;

  let repo: string | null = assignments.get('GH_REPO') ?? null;
  const positionals: string[] = [];
  let index = 3;
  while (index < words.length) {
    const word = words[index] ?? '';
    index += 1;
    if (word === '--') {
      positionals.push(...words.slice(index));
      break;
    }
    if (!word.startsWith('-') || word === '-') {
      positionals.push(word);
      continue;
    }
    if (word === '-h' || word === '--help') return NONE;

    const equals = word.indexOf('=');
    const flag = equals === -1 ? word : word.slice(0, equals);
    const inlineValue = equals === -1 ? null : word.slice(equals + 1);
    if (REPO_FLAGS.has(flag)) {
      repo = inlineValue ?? words[index] ?? null;
      if (inlineValue === null) index += 1;
    } else if (valueFlags.has(flag)) {
      if (inlineValue === null) index += 1;
    } else if (!booleanFlags.has(flag)) {
      return UNPARSEABLE;
    }
  }

  const selector = positionals[0] ?? null;
  const isUnreadable =
    positionals.length > 1 ||
    (selector !== null && isDynamic(selector)) ||
    (repo !== null && isDynamic(repo));
  if (isUnreadable) return UNPARSEABLE;

  return { kind: 'write', repo, selector, subcommand };
};

const UNKNOWN: PullRequestState = { kind: 'unknown' };

/**
 * Run a lookup with a ceiling: a throw, a rejection or running out of time are
 * all `unknown`, so the rule fails open.
 */
const lookupWithin = async (
  context: BashGuardContext,
  query: PullRequestQuery,
): Promise<PullRequestState> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<PullRequestState>((resolve) => {
    timer = setTimeout(() => {
      resolve(UNKNOWN);
    }, context.lookupTimeoutMs);
  });
  try {
    return await Promise.race([context.lookupPullRequest(query), timeout]);
  } catch (err) {
    logHookError(`${STALE_PR_WRITE_RULE_ID}: PR lookup failed`, err);
    return UNKNOWN;
  } finally {
    clearTimeout(timer);
  }
};

const describeTarget = (query: PullRequestQuery): string => {
  return query.selector === null
    ? "the current branch's PR"
    : `\`${query.selector}\``;
};

const formatDeny = (
  subcommand: string,
  query: PullRequestQuery,
  state: Extract<PullRequestState, { kind: 'found' }>,
): string => {
  const verb = state.state === 'MERGED' ? 'merged' : 'closed';
  const when = state.changedAt === null ? '' : ` (${verb} ${state.changedAt})`;
  const repo = query.repo === null ? '' : ` in ${query.repo}`;
  return [
    `Refusing \`gh pr ${subcommand}\` on PR #${state.number}${repo}: GitHub reports it ${state.state}${when}.`,
    `The command targets ${describeTarget(query)}, and acting on it now would rest on a stale premise.`,
    'A chained `gh pr view … && …` does not protect against this: `&&` checks the exit code, not the state the view printed.',
    'Re-check the PR and what you meant to do. If you do mean to reopen it, `gh pr reopen` is not guarded.',
  ].join(' ');
};

interface GuardedWrite {
  readonly query: PullRequestQuery;
  readonly subcommand: string;
}

const toGuardedWrite = (segment: BashSegment): GuardedWrite | null => {
  const write = parseGhPrWrite(segment.words);
  if (write.kind !== 'write' || segment.cwd === null) return null;
  return {
    query: { cwd: segment.cwd, repo: write.repo, selector: write.selector },
    subcommand: write.subcommand,
  };
};

const evaluate = async (
  command: Parameters<BashGuardRule['evaluate']>[0],
  context: BashGuardContext,
): Promise<BashRuleVerdict> => {
  // Short-circuit before any parsing or lookup: most commands never mention gh.
  if (!/\bgh\b/.test(command.raw) || !/\bpr\b/.test(command.raw)) {
    return BASH_RULE_ALLOW;
  }

  const writes = command.segments
    .map(toGuardedWrite)
    .filter((write): write is GuardedWrite => write !== null);
  if (writes.length === 0) return BASH_RULE_ALLOW;

  const states = await Promise.all(
    writes.map((write) => lookupWithin(context, write.query)),
  );
  const reasons = writes.flatMap((write, index) => {
    const state = states[index];
    if (state?.kind !== 'found' || !TERMINAL_STATES.has(state.state)) {
      return [];
    }
    return [formatDeny(write.subcommand, write.query, state)];
  });

  return reasons.length === 0
    ? BASH_RULE_ALLOW
    : { decision: 'deny', reason: reasons.join('\n') };
};

/** @public */
export const stalePrWriteRule: BashGuardRule = {
  evaluate,
  id: STALE_PR_WRITE_RULE_ID,
};
