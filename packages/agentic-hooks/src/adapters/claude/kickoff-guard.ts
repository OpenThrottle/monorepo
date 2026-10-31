/**
 * Claude Code half of the plan-less session kickoff guard (see
 * `./require-ot-plan-kickoff.ts`, the PreToolUse entrypoint). The decision
 * itself is tool-neutral and lives in the core (`data/kickoff.ts`); this
 * module only knows which Claude tool calls are kickoffs and where their brief
 * sits. Kept apart from the entrypoint so it can be tested without the
 * entrypoint's `process.exit`.
 *
 * Payload shape: `tool_input` is the MCP tool's own arguments. `start_session`
 * carries its brief in `prompt` (absent on an "offer", which is a title alone,
 * and on a start by `proposal_id`); `hand_off_to_session` carries it in
 * `remaining_plan`.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import {
  decideKickoffBrief,
  KICKOFF_ALLOW,
  type KickoffDecision,
  type OtIdLookup,
} from '../../index.ts';

/** Tool-name suffixes this guard applies to; MCP prefixes vary by host. */
const KICKOFF_TOOL_SUFFIXES = [
  '__start_session',
  '__hand_off_to_session',
] as const;

/** `tool_input` keys that carry a session brief. */
const BRIEF_KEYS = ['prompt', 'remaining_plan'] as const;

/** True when the payload is a session kickoff this guard applies to. */
export const isKickoffTool = (raw: unknown): boolean =>
  isRecord(raw) &&
  typeof raw.tool_name === 'string' &&
  KICKOFF_TOOL_SUFFIXES.some((suffix) =>
    String(raw.tool_name).endsWith(suffix),
  );

/** The session brief in a kickoff payload, or null when there is none. */
export const readKickoffBrief = (raw: unknown): string | null => {
  if (!isRecord(raw) || !isRecord(raw.tool_input)) return null;
  const toolInput = raw.tool_input;
  for (const key of BRIEF_KEYS) {
    const value = toolInput[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
};

/** Decide a Claude Code PreToolUse payload; non-kickoff tools always pass. */
export const decideKickoff = async (
  raw: unknown,
  lookup: (id: string) => Promise<OtIdLookup>,
): Promise<KickoffDecision> =>
  isKickoffTool(raw)
    ? decideKickoffBrief(readKickoffBrief(raw), lookup)
    : KICKOFF_ALLOW;
