/**
 * What the CLI-vs-ACP parity test accepts, and what it reports as blocking.
 * Every entry is keyed by backend + scenario + facet (see `chunkParity.ts`) and
 * carries its reason. The test fails on any difference in neither list, on an
 * entry that is no longer observed, and on a blocker that stopped reproducing,
 * so fixing a defect forces its entry out of `KNOWN_BLOCKERS`.
 *
 * Scenario names: a plain stem, `resume#1` / `resume#2` (the two turns of the
 * warm ACP `resume` recording against the CLI's `resume.turn-1` / `turn-2`)
 * and `resume.turn-2` (the fresh-process ACP transcript).
 *
 * The CLI fixtures are older than the ACP ones (cursor 2026.11.05 vs
 * 2026.11.22-e9042b2, agy 1.5.3 vs 1.5.18), which can itself account for a
 * difference; every accepted entry below was checked to be explainable
 * without it unless its reason says otherwise.
 */

import type { ParityFacetsValue } from '../../src/index.ts';

interface ParityEntry {
  readonly backend: string;
  readonly facets: readonly ParityFacetsValue[];
  readonly reason: string;
  readonly scenario: string;
}

interface KnownBlocker {
  readonly backend: string;
  readonly facets: readonly ParityFacetsValue[];
  /** What the blocker is, in one line. */
  readonly id: string;
  /** The OT plan that fixes it. */
  readonly plan: string;
  readonly reason: string;
  readonly scenarios: readonly string[];
}

const SESSION_CHUNK_REASON = `ACP emits a session chunk only when the session id changes; the CLI adapter re-emits it every turn`;

export const ACCEPTED_DIFFERENCES: readonly ParityEntry[] = [
  {
    backend: 'cursor',
    facets: ['sequence', 'tools'],
    reason: `model variance: the CLI recording made 3 tool calls, the ACP one 2, and ordered text around them differently`,
    scenario: 'tool-use',
  },
  {
    backend: 'cursor',
    facets: ['sequence', 'tools'],
    reason: `the CLI path collapses accept-edits to read-only --mode ask (no write); over ACP cursor really applies the edit`,
    scenario: 'accept-edits',
  },
  {
    backend: 'cursor',
    facets: ['sequence'],
    reason: `model variance: thinking and text interleave differently around the shell call`,
    scenario: 'thinking',
  },
  {
    backend: 'cursor',
    facets: ['session', 'sequence'],
    reason: SESSION_CHUNK_REASON,
    scenario: 'resume#2',
  },
  {
    backend: 'cursor',
    facets: ['session', 'sequence'],
    reason: SESSION_CHUNK_REASON,
    scenario: 'resume.turn-2',
  },
  {
    backend: 'antigravity',
    facets: ['sequence', 'thinking', 'tools'],
    reason: `model variance: the CLI recording made 3 tool calls and no thinking, the ACP one 2 calls and a thought`,
    scenario: 'multi-tool',
  },
  {
    backend: 'antigravity',
    facets: ['sequence', 'thinking', 'tools'],
    reason: `model variance: the CLI recording solved it with a tool call, the ACP one reasoned and answered directly`,
    scenario: 'thinking',
  },
  {
    backend: 'antigravity',
    facets: ['permission', 'sequence'],
    reason: `by design: ACP raises a permission request and waits for the answer; the headless CLI denies without one`,
    scenario: 'permission-denied',
  },
  {
    backend: 'antigravity',
    facets: ['session', 'sequence'],
    reason: SESSION_CHUNK_REASON,
    scenario: 'resume#2',
  },
  {
    backend: 'antigravity',
    facets: ['session', 'sequence'],
    reason: SESSION_CHUNK_REASON,
    scenario: 'resume.turn-2',
  },
];

const ERROR_PLAN = '6f45a1ee';
const PARITY_PLAN = '61d77ff0';

export const KNOWN_BLOCKERS: readonly KnownBlocker[] = [
  {
    backend: 'cursor',
    facets: ['sequence', 'session', 'terminal', 'thinking'],
    id: 'unknown-model-ignored',
    plan: ERROR_PLAN,
    reason: `an unknown model id is silently ignored over ACP: the turn answers on the default model and ends clean, where the CLI ends with an error naming the model`,
    scenarios: ['error'],
  },
  {
    backend: 'antigravity',
    facets: ['sequence', 'session', 'terminal'],
    id: 'unknown-model-ignored',
    plan: ERROR_PLAN,
    reason: `an unknown model id is silently ignored over ACP: the turn answers on the default model and ends clean, where the CLI ends with an error naming the model`,
    scenarios: ['error'],
  },
  {
    backend: 'cursor',
    facets: ['usage'],
    id: 'no-usage-chunk',
    plan: PARITY_PLAN,
    reason: `the ACP backend never emits a usage chunk (acp-events maps usage_update to nothing, and the prompt result is not read for token counts); the CLI adapter emits one every turn and the server persists it`,
    scenarios: [
      'accept-edits',
      'multi-tool',
      'resume#1',
      'resume#2',
      'resume.turn-2',
      'simple-turn',
      'system-prompt',
      'thinking',
      'tool-use',
    ],
  },
  {
    backend: 'antigravity',
    facets: ['usage'],
    id: 'no-usage-chunk',
    plan: PARITY_PLAN,
    reason: `the ACP backend never emits a usage chunk, although agy reports token counts on the session/prompt result; the CLI adapter emits one every turn and the server persists it`,
    scenarios: [
      'accept-edits',
      'error',
      'interrupt',
      'multi-tool',
      'permission-denied',
      'resume#1',
      'resume#2',
      'resume.turn-2',
      'simple-turn',
      'system-prompt',
      'thinking',
      'tool-use',
    ],
  },
];

interface MissingCapability {
  readonly backend: string;
  readonly capability: string;
}

/**
 * Behaviour the CLI path guarantees that the ACP path cannot yet provide, so
 * there is no fixture pair to compare. Each one alone is a NO-GO.
 *
 * Differences the chunk streams cannot show at all (the system prompt rides in
 * the prompt text, cold resume uses session/load, cursor exits 143 on dispose)
 * are asserted frame by frame in the `*.acp.replay.test.ts` files instead.
 */
export const MISSING_CAPABILITIES: readonly MissingCapability[] = [
  {
    backend: 'cursor',
    capability: `supervised write approval: over ACP cursor applies an edit without session/request_permission, where the CLI path stays read-only (--mode ask); no permission-denied ACP transcript can be recorded`,
  },
];
