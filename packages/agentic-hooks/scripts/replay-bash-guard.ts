/**
 * Replay the bash-guard rule registry over local Claude Code transcripts.
 *
 * Reads every `Bash` tool call in `~/.claude/projects/**\/*.jsonl` (sessions
 * and their `subagents/` directories), de-duplicated by tool-use id since a
 * resumed session copies its history, and feeds each command through
 * {@link evaluateBashGuard}. Prints, per rule, the commands it would have
 * denied or warned on.
 *
 * Pull-request state is resolved AS OF the command's timestamp, not as of now:
 * every PR from last month is merged today, so a live lookup would flag every
 * historical write. The current state comes from `gh pr view` (cached per PR);
 * a PR counts as MERGED/CLOSED at time T only if it merged/closed before T.
 * Two cases cannot be replayed faithfully and are reported, not judged: a
 * write with no selector (the current branch then is not the branch now), and
 * a PR that was closed and later reopened (gh keeps no state history).
 *
 * The portability rules replay as if every command ran under zsh on this
 * machine's platform, which is how the transcripts were recorded here.
 *
 * Usage:
 *   pnpm exec tsx packages/agentic-hooks/scripts/replay-bash-guard.ts \
 *     [--projects-dir <dir>] [--fallback-cwd <dir>]
 *
 * `--fallback-cwd` (default: the current directory) is where `gh` runs when a
 * transcript's directory is no longer inside a git checkout, e.g. a reaped
 * worktree or a repository that has since moved.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import {
  BASH_GUARD_RULES,
  createFsGlobMatcher,
  createGhPrLookup,
  evaluateBashGuard,
  type PullRequestQuery,
  type PullRequestState,
} from '../src/index.ts';

interface BashCall {
  readonly background: boolean;
  readonly command: string;
  readonly cwd: string;
  readonly file: string;
  readonly id: string;
  readonly timestamp: string;
}

interface Options {
  readonly fallbackCwd: string;
  readonly projectsDir: string;
}

type LookupOutcome =
  | 'closed-or-merged-before'
  | 'lookup-unknown'
  | 'no-selector'
  | 'open-at-the-time';

const parseOptions = (argv: readonly string[]): Options => {
  const valueOf = (flag: string): string | null => {
    const index = argv.indexOf(flag);
    return index === -1 ? null : (argv[index + 1] ?? null);
  };
  return {
    fallbackCwd: path.resolve(valueOf('--fallback-cwd') ?? process.cwd()),
    projectsDir: path.resolve(
      valueOf('--projects-dir') ??
        path.join(os.homedir(), '.claude', 'projects'),
    ),
  };
};

const listJsonlFiles = (dir: string): readonly string[] => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
    .map((entry) => path.join(entry.parentPath, entry.name));
};

const readBashCalls = (file: string): readonly BashCall[] => {
  const calls: BashCall[] = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.includes('"name":"Bash"')) continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRecord(entry) || !isRecord(entry.message)) continue;
    const { content } = entry.message;
    if (!Array.isArray(content)) continue;
    const cwd = typeof entry.cwd === 'string' ? entry.cwd : '';
    const timestamp =
      typeof entry.timestamp === 'string' ? entry.timestamp : '';
    for (const block of content) {
      const isBash =
        isRecord(block) && block.type === 'tool_use' && block.name === 'Bash';
      if (!isBash || !isRecord(block.input)) continue;
      const { command } = block.input;
      if (typeof command !== 'string' || typeof block.id !== 'string') continue;
      const background = block.input.run_in_background === true;
      calls.push({ background, command, cwd, file, id: block.id, timestamp });
    }
  }
  return calls;
};

const asOf = (
  current: PullRequestState,
  timestamp: string,
): { readonly outcome: LookupOutcome; readonly state: PullRequestState } => {
  if (current.kind !== 'found') {
    return { outcome: 'lookup-unknown', state: current };
  }
  const isTerminalThen =
    current.changedAt !== null && current.changedAt <= timestamp;
  if (isTerminalThen) {
    return { outcome: 'closed-or-merged-before', state: current };
  }
  return {
    outcome: 'open-at-the-time',
    state: { ...current, changedAt: null, state: 'OPEN' },
  };
};

/**
 * Whether `dir` exists and sits inside a git checkout. A directory that was a
 * checkout when the transcript was written may since have been reaped, or
 * moved (the repo root once was the parent of today's checkout).
 */
const isInGitCheckout = (dir: string): boolean => {
  let current = path.resolve(dir);
  if (!fs.existsSync(current)) return false;
  for (;;) {
    if (fs.existsSync(path.join(current, '.git'))) return true;
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
};

/** The directories before a glob's first wildcard segment (`a/b/*.ts` → `a/b`). */
const literalGlobBase = (pattern: string): string => {
  const segments = pattern.split('/');
  const firstGlob = segments.findIndex((segment) => /[*?[]/.test(segment));
  const literal =
    firstGlob === -1 ? segments.slice(0, -1) : segments.slice(0, firstGlob);
  return literal.join('/') || '.';
};

const oneLine = (text: string, max: number): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

const main = async (): Promise<void> => {
  const options = parseOptions(process.argv.slice(2));
  const files = listJsonlFiles(options.projectsDir);

  const byId = new Map<string, BashCall>();
  for (const file of files) {
    for (const call of readBashCalls(file)) {
      if (!byId.has(call.id)) byId.set(call.id, call);
    }
  }
  const calls = [...byId.values()];

  // Path globs are checked against the filesystem as it is NOW, which can
  // differ from when the command ran. A glob whose literal leading directory
  // no longer exists (a reaped worktree, a moved repo root) is answered
  // "matches", so drift cannot produce a hit.
  const fsGlob = createFsGlobMatcher({ maxEntries: 20_000, timeoutMs: 5000 });
  const replayGlobMatches = async (
    pattern: string,
    cwd: string,
  ): Promise<boolean> => {
    const base = path.resolve(cwd, literalGlobBase(pattern));
    if (!fs.existsSync(base)) return true;
    return fsGlob(pattern, cwd);
  };

  const ghLookup = createGhPrLookup({ timeoutMs: 15_000 });
  const cache = new Map<string, Promise<PullRequestState>>();
  const currentState = (query: PullRequestQuery): Promise<PullRequestState> => {
    const cwd = isInGitCheckout(query.cwd) ? query.cwd : options.fallbackCwd;
    const key = `${cwd}\u0000${query.repo ?? ''}\u0000${query.selector ?? ''}`;
    const cached = cache.get(key) ?? ghLookup({ ...query, cwd });
    cache.set(key, cached);
    return cached;
  };

  const lookups: {
    readonly outcome: LookupOutcome;
    readonly query: PullRequestQuery;
    readonly timestamp: string;
  }[] = [];

  const results = await Promise.all(
    calls.map(async (call) => {
      const result = await evaluateBashGuard(call.command, {
        background: call.background,
        cwd: call.cwd || options.fallbackCwd,
        globMatches: replayGlobMatches,
        lookupPullRequest: async (query) => {
          if (query.selector === null) {
            lookups.push({
              outcome: 'no-selector',
              query,
              timestamp: call.timestamp,
            });
            return { kind: 'unknown' };
          }
          const replayed = asOf(await currentState(query), call.timestamp);
          lookups.push({
            outcome: replayed.outcome,
            query,
            timestamp: call.timestamp,
          });
          return replayed.state;
        },
        lookupTimeoutMs: 30_000,
        platform: process.platform,
        shell: 'zsh',
      });
      return { call, result };
    }),
  );

  console.log(
    `Replayed ${calls.length} unique Bash commands from ${files.length} transcript files under ${options.projectsDir}.`,
  );
  console.log(`Guarded writes reaching a PR lookup: ${lookups.length}`);
  const sorted = [...lookups].sort(
    (a, b) =>
      a.outcome.localeCompare(b.outcome) ||
      a.timestamp.localeCompare(b.timestamp),
  );
  for (const { outcome, query, timestamp } of sorted) {
    const target = `${query.repo ?? '(cwd repo)'} ${query.selector ?? '(current branch)'}`;
    console.log(
      `  ${outcome.padEnd(24)} ${timestamp} ${target}  [${query.cwd}]`,
    );
  }

  for (const rule of BASH_GUARD_RULES) {
    const hits = results
      .filter(({ result }) => result.decision !== 'allow')
      .flatMap(({ call, result }) => {
        if (result.decision === 'allow') return [];
        return result.findings
          .filter((finding) => finding.ruleId === rule.id)
          .map((finding) => ({ call, decision: result.decision, finding }));
      })
      .sort((a, b) => a.call.timestamp.localeCompare(b.call.timestamp));

    console.log(`\n== ${rule.id}: ${hits.length} hit(s)`);
    for (const { call, decision, finding } of hits) {
      console.log(
        `- ${decision.toUpperCase()} ${call.timestamp} ${path.basename(call.file)}`,
      );
      console.log(`    cwd:     ${call.cwd}`);
      console.log(`    command: ${oneLine(call.command, 240)}`);
      console.log(`    reason:  ${oneLine(finding.reason, 200)}`);
    }
  }
};

void main();
