/**
 * Claude Code half of the bash guard (see `./bash-guard.ts`, the PreToolUse
 * entrypoint). Rules live in the neutral core (`data/bash-guard/`); this module
 * only knows where Claude Code puts the command in a `Bash` PreToolUse payload
 * and how a verdict is rendered back. Kept apart from the entrypoint so it can
 * be tested without the entrypoint's `process.exit`.
 *
 * Payload shape: `{ tool_name: 'Bash', tool_input: { command, run_in_background? }, cwd }`.
 * `run_in_background: true` is the guard context's `background`: Claude Code
 * then reports only the exit status, so masked-exit rules deny rather than warn.
 * Rendering: a deny is `hookSpecificOutput.permissionDecision: "deny"` with the
 * reason; a warn is `hookSpecificOutput.additionalContext`, which Claude Code
 * (2.1.x) accepts on PreToolUse and shows the model without blocking the call.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import {
  type BashGuardContext,
  type BashGuardResult,
  evaluateBashGuard,
  formatBashGuardFindings,
} from '../../index.ts';

/** The command and directory of a `Bash` PreToolUse payload. */
export interface ClaudeBashCall {
  readonly background: boolean;
  readonly command: string;
  readonly cwd: string | null;
}

/** The `Bash` call in a PreToolUse payload, or null for any other tool. */
export const readClaudeBashCall = (raw: unknown): ClaudeBashCall | null => {
  if (!isRecord(raw) || raw.tool_name !== 'Bash') return null;
  if (!isRecord(raw.tool_input)) return null;
  const { command } = raw.tool_input;
  if (typeof command !== 'string') return null;
  const cwd = typeof raw.cwd === 'string' && raw.cwd !== '' ? raw.cwd : null;
  const background = raw.tool_input.run_in_background === true;
  return { background, command, cwd };
};

/** The PreToolUse stdout for a guard result, or null to print nothing. */
export const renderClaudeBashGuard = (
  result: BashGuardResult,
): string | null => {
  if (result.decision === 'allow') return null;
  const message = formatBashGuardFindings(result.findings);
  if (result.decision === 'warn') {
    const hookSpecificOutput = {
      additionalContext: message,
      hookEventName: 'PreToolUse',
    };
    return `${JSON.stringify({ hookSpecificOutput })}\n`;
  }
  const hookSpecificOutput = {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: message,
  };
  return `${JSON.stringify({ hookSpecificOutput })}\n`;
};

/**
 * Decide a Claude Code PreToolUse payload end to end: non-`Bash` tools pass,
 * and the directory falls back to `fallbackCwd` when the payload has none.
 */
export const decideClaudeBashGuard = async (
  raw: unknown,
  fallbackCwd: string,
  context: Omit<BashGuardContext, 'background' | 'cwd'>,
): Promise<string | null> => {
  const call = readClaudeBashCall(raw);
  if (call === null) return null;
  const result = await evaluateBashGuard(call.command, {
    ...context,
    background: call.background,
    cwd: call.cwd ?? fallbackCwd,
  });
  return renderClaudeBashGuard(result);
};
