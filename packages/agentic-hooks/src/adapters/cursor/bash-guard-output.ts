/**
 * Cursor half of the bash guard (see `./bash-guard.ts`, the
 * `beforeShellExecution` entrypoint). Rules live in the neutral core
 * (`data/bash-guard/`); this module only maps Cursor's payload in and the
 * verdict out. No rule logic belongs here.
 *
 * Shapes, from Cursor's hooks reference (cursor.com/docs/agent/hooks,
 * "beforeShellExecution", read 2026-11-07) and the envelope captured in
 * `docs/monorepo/cursor-agent-hook-probe.md`:
 *
 * - Input: `{ command, cwd, sandbox }` plus the common envelope, which carries
 *   `workspace_roots`. The probe saw `cwd: ""` on Shell events, so an empty cwd
 *   falls back to the first workspace root.
 * - Output: `{ permission: "allow" | "deny" | "ask", user_message,
 *   agent_message }`. Cursor treats invalid JSON or an off-schema response from
 *   a permission hook as a DENY, so this adapter always renders a complete
 *   response, and an allow is an explicit `{"permission":"allow"}`.
 * - There is no non-blocking context channel on this event, so a warn is an
 *   allow carrying `agent_message`. The schema accepts it; whether Cursor
 *   shows it to the agent on an allow is not documented.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import {
  type BashGuardContext,
  type BashGuardResult,
  evaluateBashGuard,
  formatBashGuardFindings,
} from '../../index.ts';

/** The rendered allow. Also the entrypoint's answer on any internal failure. */
export const CURSOR_SHELL_ALLOW = `${JSON.stringify({ permission: 'allow' })}\n`;

/** The command and directory of a `beforeShellExecution` payload. */
export interface CursorShellCall {
  readonly command: string;
  readonly cwd: string | null;
}

const readNonEmpty = (value: unknown): string | null => {
  return typeof value === 'string' && value !== '' ? value : null;
};

/** The shell call in a `beforeShellExecution` payload, or null. */
export const readCursorShellCall = (raw: unknown): CursorShellCall | null => {
  if (!isRecord(raw) || typeof raw.command !== 'string') return null;
  const event = raw.hook_event_name;
  if (event !== undefined && event !== 'beforeShellExecution') return null;
  const roots = Array.isArray(raw.workspace_roots) ? raw.workspace_roots : [];
  const cwd = readNonEmpty(raw.cwd) ?? readNonEmpty(roots[0]);
  return { command: raw.command, cwd };
};

/** The `beforeShellExecution` stdout for a guard result. Never empty. */
export const renderCursorBashGuard = (result: BashGuardResult): string => {
  if (result.decision === 'allow') return CURSOR_SHELL_ALLOW;
  const message = formatBashGuardFindings(result.findings);
  if (result.decision === 'warn') {
    return `${JSON.stringify({ agent_message: message, permission: 'allow' })}\n`;
  }
  const ruleIds = result.findings.map((finding) => finding.ruleId).join(', ');
  return `${JSON.stringify({
    agent_message: message,
    permission: 'deny',
    user_message: `Blocked by the bash guard (${ruleIds}).`,
  })}\n`;
};

/**
 * Decide a Cursor `beforeShellExecution` payload end to end. A payload that is
 * not a shell call is allowed; the directory falls back to `fallbackCwd`.
 */
export const decideCursorBashGuard = async (
  raw: unknown,
  fallbackCwd: string,
  context: Omit<BashGuardContext, 'cwd'>,
): Promise<string> => {
  const call = readCursorShellCall(raw);
  if (call === null) return CURSOR_SHELL_ALLOW;
  const result = await evaluateBashGuard(call.command, {
    ...context,
    cwd: call.cwd ?? fallbackCwd,
  });
  return renderCursorBashGuard(result);
};
