/**
 * @description Reads a CLI trial's tool selection out of its ATIF trajectory and checks it against what the
 * sandbox actually served.
 *
 * A CLI run is multi-turn — the sandbox answers, so the agent may keep going — and each CLI names an MCP call its
 * own way: claude and cursor as `mcp__<server>__<tool>`, codex as a generic `mcp_tool_call` carrying `server` and
 * `tool`. The graded selection is therefore every call up to and including the FIRST OpenThrottle call — or, when
 * the case expects a write, the first OT call that writes ({@link CliGradeBoundary}) — with each OT call's name
 * normalized to the bare tool name and its arguments taken from the sandbox log (what the server really
 * received), so {@link gradeCase} grades it like a Messages API first turn.
 */

import type {
  AtifToolCall,
  AtifTrajectory,
} from '@openthrottle/openthrottle-agentic-utils';

import type { SandboxToolCall } from '../sandbox/createSandboxMcpServer.ts';
import { SANDBOX_SERVER_NAME } from './data/cli-drivers.ts';
import type { CaseExpectation, SelectedCall, Selection } from './eval-case.ts';

/**
 * @description An OpenThrottle call as a trajectory names it: which server served it and the bare tool name.
 */
export interface OtCallRef {
  readonly server: string;
  readonly tool: string;
}

/**
 * @description The outcome of reading one CLI trial. `leak` means the trajectory shows an OpenThrottle call on a
 * server other than the sandbox — some other (possibly real) server answered it — and the run must stop.
 * `mismatch` means the trajectory and the sandbox log disagree, so the trial cannot be graded: typically a call
 * the CLI made to the sandbox's server name that failed before reaching it (an approval gate, a startup
 * failure). Under the attachments in `sandbox-attachment.ts` that name can only resolve to the sandbox, so an
 * unserved call there is a failed call, not a leak.
 */
export type CliSelectionOutcome =
  | { readonly kind: 'leak'; readonly reason: string }
  | { readonly kind: 'mismatch'; readonly reason: string }
  | {
      readonly kind: 'selection';
      readonly selection: Extract<Selection, { readonly kind: 'calls' }>;
    };

const MCP_PREFIX = /^mcp__(.+?)__(.+)$/;

/**
 * @description The OpenThrottle call `call` represents, or `undefined` for a harness call (Bash, Read, …) or an
 * MCP call to a tool that is not on the OT surface.
 * @public
 */
export function otCallOf(
  call: AtifToolCall,
  otToolNames: ReadonlySet<string>,
): OtCallRef | undefined {
  const prefixed = MCP_PREFIX.exec(call.function_name);
  if (prefixed?.[1] !== undefined && prefixed[2] !== undefined) {
    return otToolNames.has(prefixed[2])
      ? { server: prefixed[1], tool: prefixed[2] }
      : undefined;
  }

  if (call.function_name === 'mcp_tool_call') {
    const { server, tool } = call.arguments;
    if (typeof tool === 'string' && otToolNames.has(tool)) {
      return { server: typeof server === 'string' ? server : '', tool };
    }
  }

  return undefined;
}

const allCalls = (trajectory: AtifTrajectory): readonly AtifToolCall[] => {
  return trajectory.steps.flatMap((step) => {
    return step.source === 'agent' ? (step.tool_calls ?? []) : [];
  });
};

const lastAgentMessage = (trajectory: AtifTrajectory): string => {
  const messages = trajectory.steps.flatMap((step) => {
    return step.source === 'agent' && step.message !== '' ? [step.message] : [];
  });

  return messages.at(-1) ?? '';
};

const selectionOf = (
  calls: readonly SelectedCall[],
  text: string,
): CliSelectionOutcome => {
  return {
    kind: 'selection',
    selection: {
      calls,
      kind: 'calls',
      text,
      usage: {
        cacheReadInputTokens: 0,
        cacheWriteInputTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
      },
    },
  };
};

/**
 * @description Where a CLI trial's graded selection ends. `first-ot-call` stops at the first OpenThrottle call,
 * exactly like a Messages API first turn. `first-write` carries on past read-only OT calls to the first call that
 * is not one, because a multi-turn CLI agent often reads before it writes (claude loads deferred schemas with
 * `ToolSearch`, then calls `get_task` before `update_task`) and grading that read would fail an agent that was
 * heading for the right tool.
 */
export type CliGradeBoundary = 'first-ot-call' | 'first-write';

const READ_ONLY_OT_TOOL =
  /^(?:auth_status|get_[a-z_]+|health|list_[a-z_]+|semantic_search)$/;

/**
 * @description Whether an OT tool only reads: `get_*`, `list_*`, `semantic_search`, `health` and `auth_status`.
 * @public
 */
export function isReadOnlyOtTool(tool: string): boolean {
  return READ_ONLY_OT_TOOL.test(tool);
}

/**
 * @description The boundary a case is graded to. Only a `call` case whose every expected tool writes grades to the
 * first write; a case expecting a read, and a `no-call` control case, still grade to the first OT call, so a
 * stray read keeps failing them.
 * @public
 */
export function cliGradeBoundaryOf(
  expectation: CaseExpectation,
): CliGradeBoundary {
  if (expectation.kind === 'no-call') {
    return 'first-ot-call';
  }

  return expectation.tools.some(isReadOnlyOtTool)
    ? 'first-ot-call'
    : 'first-write';
}

/**
 * @description Index into `calls` one past the last graded call: through the first OT call (or, for
 * `first-write`, the first OT call that writes), or every call when no such call exists.
 */
const gradedEnd = (
  refs: readonly (OtCallRef | undefined)[],
  boundary: CliGradeBoundary,
): number => {
  const index = refs.findIndex((ref) => {
    if (ref === undefined) {
      return false;
    }

    return boundary === 'first-ot-call' || !isReadOnlyOtTool(ref.tool);
  });

  return index === -1 ? refs.length : index + 1;
};

/**
 * @description The graded selection of one CLI trial, cross-checked against the sandbox call log. Every OT call
 * the trajectory shows must have been served by the sandbox, under {@link SANDBOX_SERVER_NAME}, and every graded
 * OT call must match the sandbox log in order. `boundary` comes from {@link cliGradeBoundaryOf}.
 * @public
 */
export function cliSelectionOf(
  trajectory: AtifTrajectory,
  callLog: readonly SandboxToolCall[],
  otToolNames: ReadonlySet<string>,
  boundary: CliGradeBoundary,
): CliSelectionOutcome {
  const calls = allCalls(trajectory);
  const refs = calls.map((call) => {
    return otCallOf(call, otToolNames);
  });
  const foreign = refs.find((ref) => {
    return ref !== undefined && ref.server !== SANDBOX_SERVER_NAME;
  });
  if (foreign !== undefined) {
    return {
      kind: 'leak',
      reason: `${foreign.tool} was called on MCP server "${foreign.server}", not the sandbox`,
    };
  }

  const otRefs = refs.filter((ref) => {
    return ref !== undefined;
  });
  if (otRefs.length > callLog.length) {
    return {
      kind: 'mismatch',
      reason: `the trajectory shows ${otRefs.length} OT call(s) but the sandbox served ${callLog.length}; a call failed before reaching it`,
    };
  }
  if (otRefs.length === 0 && callLog[0] !== undefined) {
    return {
      kind: 'mismatch',
      reason: `the sandbox served ${callLog[0].tool} but the trajectory recorded no OT call`,
    };
  }

  const end = gradedEnd(refs, boundary);
  const gradedOt = refs.slice(0, end).filter((ref) => {
    return ref !== undefined;
  });
  const disagreement = gradedOt.findIndex((ref, ordinal) => {
    return callLog[ordinal]?.tool !== ref.tool;
  });
  if (disagreement !== -1) {
    return {
      kind: 'mismatch',
      reason: `the trajectory's OT call #${disagreement + 1} is ${gradedOt[disagreement]?.tool ?? 'nothing'} but the sandbox served ${callLog[disagreement]?.tool ?? 'nothing'}`,
    };
  }

  const graded = calls.slice(0, end).map((call, index): SelectedCall => {
    const ordinal = refs.slice(0, index).filter((ref) => {
      return ref !== undefined;
    }).length;
    const served = refs[index] === undefined ? undefined : callLog[ordinal];

    return served === undefined
      ? { input: call.arguments, name: call.function_name }
      : { input: served.args, name: served.tool };
  });

  return selectionOf(graded, lastAgentMessage(trajectory));
}
