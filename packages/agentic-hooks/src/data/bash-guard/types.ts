/**
 * The bash-guard contract: what a rule receives and what it may answer.
 *
 * One PreToolUse-style guard evaluates every shell command an agent is about to
 * run against a registry of rules. A rule is pure apart from the capabilities
 * it is handed in {@link BashGuardContext}, so it can be tested without a shell
 * or a network. Each tool's adapter decides how a verdict is rendered back to
 * its harness.
 *
 * @public
 */

/**
 * A shell control operator joining two simple commands. A newline is read as
 * `;`; subshell parentheses are not operators.
 *
 * @public
 */
export type BashOperator = '&&' | '&' | ';' | '|' | '|&' | '||';

/**
 * One simple command as the lexer sees it: its words after quote removal, the
 * same words as written in the source, and the operator joining it to the previous command (`null` for the first).
 *
 * @public
 */
export interface LexedShellSegment {
  readonly precededBy: BashOperator | null;
  /** Each word as written, quotes and backslashes intact; parallel to `words`. */
  readonly rawWords: readonly string[];
  readonly words: readonly string[];
}

/**
 * One simple command from a shell line, plus the directory it will run in when
 * that can be known statically (`null` when an earlier `cd` went somewhere the
 * parser cannot follow, e.g. `cd "$DIR"`).
 *
 * @public
 */
export interface BashSegment extends LexedShellSegment {
  readonly cwd: string | null;
}

/** @public */
export interface ParsedBashCommand {
  readonly raw: string;
  readonly segments: readonly BashSegment[];
}

/**
 * What GitHub says about one pull request, or `unknown` for anything short of
 * a clean answer (no CLI, no auth, no such PR, a timeout).
 *
 * @public
 */
export type PullRequestState =
  | {
      readonly changedAt: string | null;
      readonly kind: 'found';
      readonly number: number;
      readonly state: string;
    }
  | { readonly kind: 'unknown' };

/**
 * Which pull request a command targets. `selector` is the number, URL or
 * branch the command named, or `null` for "the current branch's PR".
 *
 * @public
 */
export interface PullRequestQuery {
  readonly cwd: string;
  readonly repo: string | null;
  readonly selector: string | null;
}

/** @public */
export type PullRequestLookup = (
  query: PullRequestQuery,
) => Promise<PullRequestState>;

/**
 * Capabilities a rule may use. Injected so rules stay pure and testable.
 *
 * @public
 */
export interface BashGuardContext {
  /**
   * @description Whether the harness runs the command detached and reports
   * only its exit status (a background shell call). A masked exit
   * status is then the only signal anyone sees, so rules may judge it harder.
   */
  readonly background: boolean;
  readonly cwd: string;
  /**
   * Whether `pattern` (a shell glob, already relative to or rooted against
   * `cwd`) matches at least one path. Must answer `true` whenever it cannot
   * tell — a timeout, an unreadable directory, too much work — so a rule that
   * asks fails open.
   */
  readonly globMatches: GlobMatcher;
  readonly lookupPullRequest: PullRequestLookup;
  readonly lookupTimeoutMs: number;
  /** `process.platform` of the machine the command will run on. */
  readonly platform: string;
  /** Basename of the user's login shell (`zsh`, `bash`, …), or null if unknown. */
  readonly shell: string | null;
}

/** @public */
export type GlobMatcher = (pattern: string, cwd: string) => Promise<boolean>;

/** @public */
export type BashRuleVerdict =
  | { readonly decision: 'allow' }
  | { readonly decision: 'deny'; readonly reason: string }
  | { readonly decision: 'warn'; readonly reason: string };

/** @public */
export interface BashGuardRule {
  readonly evaluate: (
    command: ParsedBashCommand,
    context: BashGuardContext,
  ) => Promise<BashRuleVerdict>;
  readonly id: string;
}

/** @public */
export interface BashGuardFinding {
  readonly reason: string;
  readonly ruleId: string;
}

/**
 * The registry's combined answer. Any deny wins; otherwise any warn; otherwise
 * allow. `findings` carries every rule that did not allow, in registry order.
 *
 * @public
 */
export type BashGuardResult =
  | { readonly decision: 'allow' }
  | {
      readonly decision: 'deny';
      readonly findings: readonly BashGuardFinding[];
    }
  | {
      readonly decision: 'warn';
      readonly findings: readonly BashGuardFinding[];
    };

/** @public */
export const BASH_RULE_ALLOW: BashRuleVerdict = { decision: 'allow' };
