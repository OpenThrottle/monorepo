/**
 * The bash-guard registry: every rule the guard runs, and the one function an
 * adapter calls to evaluate a command against all of them.
 *
 * Add a rule by appending it to {@link BASH_GUARD_RULES}. Do not add a second
 * hook entrypoint per rule — one guard, many rules.
 *
 * Fail-open throughout: a rule that throws contributes nothing.
 *
 * @public
 */
import { logHookError } from '../../utils/logging.ts';
import { parseBashCommand } from './shell-words.ts';
import { stalePrWriteRule } from './stale-pr-write.ts';
import type {
  BashGuardContext,
  BashGuardFinding,
  BashGuardResult,
  BashGuardRule,
  BashRuleVerdict,
} from './types.ts';

/** @public */
export const BASH_GUARD_RULES: readonly BashGuardRule[] = [stalePrWriteRule];

const runRule = async (
  rule: BashGuardRule,
  command: Parameters<BashGuardRule['evaluate']>[0],
  context: BashGuardContext,
): Promise<BashRuleVerdict> => {
  try {
    return await rule.evaluate(command, context);
  } catch (err) {
    logHookError(`bash-guard: rule ${rule.id} threw`, err);
    return { decision: 'allow' };
  }
};

/**
 * Evaluate `command` against `rules` (default: the full registry). Any deny
 * wins; otherwise any warn; otherwise allow.
 *
 * @public
 */
export const evaluateBashGuard = async (
  command: string,
  context: BashGuardContext,
  rules: readonly BashGuardRule[] = BASH_GUARD_RULES,
): Promise<BashGuardResult> => {
  if (command.trim() === '') return { decision: 'allow' };

  const parsed = parseBashCommand(command, context.cwd);
  const verdicts = await Promise.all(
    rules.map((rule) => runRule(rule, parsed, context)),
  );

  const denies: BashGuardFinding[] = [];
  const warns: BashGuardFinding[] = [];
  verdicts.forEach((verdict, index) => {
    const ruleId = rules[index]?.id ?? 'unknown';
    if (verdict.decision === 'deny') {
      denies.push({ reason: verdict.reason, ruleId });
    } else if (verdict.decision === 'warn') {
      warns.push({ reason: verdict.reason, ruleId });
    }
  });

  if (denies.length > 0) return { decision: 'deny', findings: denies };
  if (warns.length > 0) return { decision: 'warn', findings: warns };
  return { decision: 'allow' };
};

/**
 * One human-readable message for a non-allow result, rule ids included.
 *
 * @public
 */
export const formatBashGuardFindings = (
  findings: readonly BashGuardFinding[],
): string => {
  return findings
    .map((finding) => `[bash-guard:${finding.ruleId}] ${finding.reason}`)
    .join('\n');
};
