/**
 * Builds the `cursor-agent` argument array. Every value — including the user
 * prompt — is a discrete array element, never interpolated into a string, so
 * shell metacharacters can never escape (the adapter spawns without a shell).
 * The flag set is the one verified in docs/openthrottle/cursor-agent-stream-json-schema.md.
 */

import {
  CONVERSATION_REASONING_EFFORTS,
  CONVERSATION_SERVICE_TIERS,
  type ConversationReasoningEffort,
  type ConversationServiceTier,
} from '../types.ts';

/**
 * Env var holding an absolute path to the cursor-agent binary; overrides PATH lookup.
 */
export const CURSOR_AGENT_BIN_ENV = `OPENTHROTTLE_CURSOR_AGENT_BIN`;

/**
 * Default binary name, resolved off PATH when the env override is unset.
 */
export const CURSOR_AGENT_DEFAULT_BIN = `cursor-agent`;

/**
 * Inputs for one streamed cursor-agent turn.
 */
export interface CursorAgentArgvOptions {
  /** Workspace directory; passed as `--workspace` (and used as the spawn cwd). */
  readonly cwd: string;
  /** Model id; omitted when undefined so cursor-agent uses its default. */
  readonly model?: string;
  /** The fully-composed prompt (persona prefix already applied by the caller). */
  readonly prompt: string;
  /**
   * Composer reasoning effort. cursor-agent carries reasoning + tier as a
   * bracket suffix ON the model string (`<model>[effort=…,fast=…]`), so it is
   * honored ONLY when a `model` is also selected. Mapped to cursor's
   * `effort=low|medium|high` (`extraHigh`/`max`/`ultra` → `high`).
   */
  readonly reasoning?: ConversationReasoningEffort;
  /**
   * Composer service tier, carried in the same model-string bracket as
   * `fast=<bool>` (`fast` → `fast=true`, `standard` → `fast=false`). Like
   * {@link reasoning}, honored only when a `model` is selected.
   */
  readonly serviceTier?: ConversationServiceTier;
  /** Chat session id to resume; one OT conversation maps to one cursor chat. */
  readonly sessionId: string;
}

/**
 * Map the composer reasoning level onto cursor's bracket `effort=` value
 * (`low`/`medium`/`high`), or `undefined` to omit. `extraHigh`/`max`/`ultra`
 * clamp to `high`.
 */
function bracketEffort(
  reasoning: ConversationReasoningEffort | undefined,
): string | undefined {
  switch (reasoning) {
    case CONVERSATION_REASONING_EFFORTS.low:
      return 'low';
    case CONVERSATION_REASONING_EFFORTS.medium:
      return 'medium';
    case CONVERSATION_REASONING_EFFORTS.high:
    case CONVERSATION_REASONING_EFFORTS.extraHigh:
    case CONVERSATION_REASONING_EFFORTS.max:
    case CONVERSATION_REASONING_EFFORTS.ultra:
      return 'high';
    default:
      return undefined;
  }
}

/**
 * Compose the cursor-agent model spec, appending a `[effort=…,fast=…]` bracket
 * for any reasoning/tier selections. Returns the bare model when neither
 * applies. Reasoning/tier can only ride on a concrete model string, so they are
 * silently dropped when `model` is unset (cursor then uses its own defaults).
 */
function composeModelSpec(
  model: string,
  reasoning: ConversationReasoningEffort | undefined,
  serviceTier: ConversationServiceTier | undefined,
): string {
  const parts: string[] = [];

  const effort = bracketEffort(reasoning);
  if (effort !== undefined) {
    parts.push(`effort=${effort}`);
  }

  if (serviceTier === CONVERSATION_SERVICE_TIERS.fast) {
    parts.push('fast=true');
  } else if (serviceTier === CONVERSATION_SERVICE_TIERS.standard) {
    parts.push('fast=false');
  }

  return parts.length > 0 ? `${model}[${parts.join(',')}]` : model;
}

/**
 * Assemble the argv for a streamed, headless, session-resumed turn. The prompt
 * is always the final element.
 */
export function buildCursorAgentArgv(
  options: CursorAgentArgvOptions,
): string[] {
  const argv = [
    '--print',
    '--output-format',
    'stream-json',
    '--stream-partial-output',
    '--workspace',
    options.cwd,
    '--trust',
    '--resume',
    options.sessionId,
  ];

  if (options.model !== undefined && options.model !== '') {
    argv.push(
      '--model',
      composeModelSpec(options.model, options.reasoning, options.serviceTier),
    );
  }

  // End-of-options marker: persona system prompts are skill markdown that often
  // starts with YAML frontmatter (`---`), which commander/yargs would otherwise
  // treat as an unknown flag (`error: unknown option '---'`).
  argv.push('--', options.prompt);

  return argv;
}
