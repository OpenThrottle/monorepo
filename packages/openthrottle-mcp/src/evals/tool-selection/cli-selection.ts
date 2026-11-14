/**
 * @description Reads a CLI trial's tool selection out of its ATIF trajectory and checks it against what the
 * sandbox actually served.
 *
 * A CLI run is multi-turn — the sandbox answers, so the agent may keep going — and each CLI names an MCP call its
 * own way: claude and cursor as `mcp__<server>__<tool>`, codex as a generic `mcp_tool_call` carrying `server` and
 * `tool`. The graded selection is therefore every harness call up to and including the FIRST OpenThrottle call,
 * with that call's name normalized to the bare tool name and its arguments taken from the sandbox log (what the
 * server really received), so {@link gradeCase} grades it exactly like a Messages API first turn.
 */

import type {
  AtifToolCall,
  AtifTrajectory,
} from '@openthrottle/openthrottle-agentic-utils';

import type { SandboxToolCall } from '../sandbox/createSandboxMcpServer.ts';
import { SANDBOX_SERVER_NAME } from './data/data.cli-drivers.ts';
import type { SelectedCall, Selection } from './eval-case.ts';

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
 * @description The graded selection of one CLI trial, cross-checked against the sandbox call log. Every OT call
 * the trajectory shows must have been served by the sandbox, under {@link SANDBOX_SERVER_NAME}.
 * @public
 */
export function cliSelectionOf(
  trajectory: AtifTrajectory,
  callLog: readonly SandboxToolCall[],
  otToolNames: ReadonlySet<string>,
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

  const otCount = refs.filter((ref) => {
    return ref !== undefined;
  }).length;
  if (otCount > callLog.length) {
    return {
      kind: 'mismatch',
      reason: `the trajectory shows ${otCount} OT call(s) but the sandbox served ${callLog.length}; a call failed before reaching it`,
    };
  }

  const firstIndex = refs.findIndex((ref) => {
    return ref !== undefined;
  });
  const first = refs[firstIndex];
  const served = callLog[0];
  const text = lastAgentMessage(trajectory);
  const harness = (end: number): SelectedCall[] => {
    return calls.slice(0, end).map((call) => {
      return { input: call.arguments, name: call.function_name };
    });
  };

  if (first === undefined) {
    if (served !== undefined) {
      return {
        kind: 'mismatch',
        reason: `the sandbox served ${served.tool} but the trajectory recorded no OT call`,
      };
    }

    return selectionOf(harness(calls.length), text);
  }

  if (served?.tool !== first.tool) {
    return {
      kind: 'mismatch',
      reason: `the trajectory's first OT call is ${first.tool} but the sandbox first served ${served?.tool ?? 'nothing'}`,
    };
  }

  return selectionOf(
    [...harness(firstIndex), { input: served.args, name: served.tool }],
    text,
  );
}
