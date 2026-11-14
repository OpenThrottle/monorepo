/**
 * @description Antigravity (agy) PreToolUse hook that enforces the shell deny
 * rules from `.agents/agent-config.json`. agy loads it from the generated
 * workspace plugin (`.agents/plugins/openthrottle/hooks.json`), which runs
 * `node` on this file with cwd = the plugin folder, for every `run_command`.
 *
 * agy's own `--settings` permission rules are token prefixes with no globs, so
 * they cannot express rules such as `git push*--force`; a hook can, and it is
 * committable with no driver flag. Design: docs/monorepo/agent-config-parity.md.
 *
 * Contract (agy 1.5.8, probed): stdin is JSON carrying
 * `toolCall.args.CommandLine`; stdout must be a JSON decision. An empty object
 * or a crash DENIES the command, so every path prints a decision. A non-match
 * answers `ask`, which defers to agy's normal policy (it runs under
 * `--dangerously-skip-permissions` and honors `permissions.allow`); `allow`
 * would silently bypass that policy.
 */
import { readFileSync } from 'node:fs';

/** The generated rules file, next to `hooks.json` (the hook's cwd). */
const RULES_FILE = 'deny-rules.json';

export interface HookDecision {
  readonly decision: 'ask' | 'deny';
  readonly reason: string | undefined;
}

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/** Split a shell line into the commands it chains (`&&`, `||`, `;`, `|`, newline). */
export const splitCommandSegments = (commandLine: string): string[] => {
  return commandLine
    .split(/&&|\|\||[;|\n]/)
    .map((segment) => segment.trim().replace(/^[({]\s*/, ''))
    .filter((segment) => segment !== '');
};

/** `*` matches any run of characters (spaces included); everything else is literal. */
export const globToRegExp = (glob: string): RegExp => {
  const body = glob
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');

  return new RegExp(`^${body}$`);
};

/** Deny when any chained command matches any deny glob; otherwise defer to agy. */
export const decide = (
  commandLine: string,
  denyGlobs: readonly string[],
): HookDecision => {
  const patterns = denyGlobs.map((glob) => ({ glob, regExp: globToRegExp(glob) })); // prettier-ignore

  for (const segment of splitCommandSegments(commandLine)) {
    const hit = patterns.find((pattern) => pattern.regExp.test(segment));

    if (hit !== undefined) {
      return {
        decision: 'deny',
        reason: `\`${segment}\` matches the repo deny rule \`${hit.glob}\` (.agents/agent-config.json)`,
      };
    }
  }

  return { decision: 'ask', reason: undefined };
};

/** `toolCall.args.CommandLine` from the hook payload, or undefined. */
export const commandLineOf = (payload: unknown): string | undefined => {
  if (!isObject(payload) || !isObject(payload['toolCall'])) {
    return undefined;
  }

  const args = payload['toolCall']['args'];
  const commandLine = isObject(args) ? args['CommandLine'] : undefined;

  return typeof commandLine === 'string' ? commandLine : undefined;
};

/** The `deny` globs from the generated rules file text. */
export const parseDenyRules = (text: string): string[] | undefined => {
  const parsed: unknown = JSON.parse(text);

  if (!isObject(parsed) || !Array.isArray(parsed['deny'])) {
    return undefined;
  }

  const deny: unknown[] = parsed['deny'];

  return deny.every((glob): glob is string => typeof glob === 'string')
    ? deny
    : undefined;
};

const run = (stdin: string, rulesText: string): HookDecision => {
  const commandLine = commandLineOf(JSON.parse(stdin));

  if (commandLine === undefined) {
    return { decision: 'ask', reason: undefined };
  }

  const denyGlobs = parseDenyRules(rulesText);

  if (denyGlobs === undefined) {
    return {
      decision: 'deny',
      reason: `${RULES_FILE} is malformed; regenerate it with pnpm exec tsx scripts/sync-agent-config.ts`,
    };
  }

  return decide(commandLine, denyGlobs);
};

export const main = (): HookDecision => {
  try {
    return run(readFileSync(0, 'utf8'), readFileSync(RULES_FILE, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { decision: 'deny', reason: `repo deny hook failed: ${message}` };
  }
};

if (process.argv[1]?.endsWith('antigravity-deny-hook.ts')) {
  process.stdout.write(`${JSON.stringify(main())}\n`);
}
