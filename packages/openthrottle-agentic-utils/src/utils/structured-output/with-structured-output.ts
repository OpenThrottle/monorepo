/**
 * @description Turns a plan-run driver into one that emits its CLI's structured stream while every
 * consumer of the run keeps seeing prose. The driver package cannot do this itself: the per-CLI
 * parsers live here, and this package depends on the drivers, not the other way round. So the
 * structured flag is opt-in on the driver (`outputFormat`) and only switched on by this wrapper,
 * which installs the matching `parseOutput` (Ralph reads its `<promise>…</promise>` markers from the
 * recovered text) and `renderOutputLine` (plan output and job logs stay readable).
 */

import type {
  AgentDriver,
  DriverParsedOutput,
  UsageLimit,
} from '@openthrottle/openthrottle-drivers';
import {
  DRIVER_OUTPUT_FORMATS,
  DRIVERS,
  formatToolLine,
} from '@openthrottle/openthrottle-drivers';

import type { ConversationStreamChunk } from '../conversation-backend/types.ts';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '../conversation-backend/types.ts';
import {
  createStructuredChunkReader,
  parseStructuredLine,
  readStructuredOutput,
} from './chunk-reader.ts';

const stringOrNull = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null;
};

const toolNameOf = (chunk: ConversationStreamChunk): string => {
  const metadata = chunk.metadata ?? {};
  const name = stringOrNull(metadata.toolName) ?? stringOrNull(metadata.name);

  return name ?? 'tool';
};

/**
 * The tool's arguments, where the CLI's event clearly carries them: `metadata.toolCall` (claude,
 * cursor, gemini, antigravity, opencode) or, for codex, the finished `item` (its `command`). grok
 * maps no tool events, so its lines have nothing to show.
 */
const toolInputOf = (chunk: ConversationStreamChunk): unknown => {
  const metadata = chunk.metadata ?? {};

  return metadata.toolCall ?? metadata.item;
};

const toolLineOf = (chunk: ConversationStreamChunk): string => {
  return formatToolLine(toolNameOf(chunk), toolInputOf(chunk));
};

const isToolChunk = (chunk: ConversationStreamChunk): boolean => {
  return (
    chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.toolCall ||
    chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.toolResult
  );
};

const usageLimitOf = (chunk: ConversationStreamChunk): UsageLimit | null => {
  if (chunk.kind !== CONVERSATION_STREAM_CHUNK_KINDS.usageLimit) {
    return null;
  }

  const metadata = chunk.metadata ?? {};

  return {
    rateLimitType: stringOrNull(metadata.rateLimitType),
    resetsAt: stringOrNull(metadata.resetsAt),
  };
};

/**
 * @description What a text-mode run would have printed, recovered from the chunks: the assistant
 * text in order, with a line break wherever a tool call interrupted it, plus any stream error.
 * When stdout held no JSON events at all (a crash, an auth failure printed as prose) the raw
 * stdout is returned so the failure stays visible.
 * @public
 */
export const recoverStructuredText = (
  driverId: string,
  rawStdout: string,
): DriverParsedOutput => {
  const chunks = readStructuredOutput(driverId, rawStdout);

  if (chunks.length === 0) {
    return { text: rawStdout.trim(), usageLimit: null };
  }

  const parts: string[] = [];
  let usageLimit: UsageLimit | null = null;
  let interrupted = false;

  for (const chunk of chunks) {
    usageLimit = usageLimitOf(chunk) ?? usageLimit;

    if (typeof chunk.error === 'string' && chunk.error.trim() !== '') {
      parts.push(`\nError: ${chunk.error.trim()}`);
    }

    if (chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.text) {
      if (interrupted && parts.length > 0) {
        parts.push('\n');
      }

      parts.push(chunk.delta);
      interrupted = false;
    } else if (isToolChunk(chunk)) {
      interrupted = true;
    }
  }

  return { text: parts.join('').trim(), usageLimit };
};

const renderChunk = (
  chunk: ConversationStreamChunk,
  hasSeenToolCall: boolean,
): string | null => {
  if (typeof chunk.error === 'string' && chunk.error.trim() !== '') {
    return `Error: ${chunk.error.trim()}`;
  }

  switch (chunk.kind) {
    case CONVERSATION_STREAM_CHUNK_KINDS.text:
      return chunk.delta.trim() === '' ? null : chunk.delta;
    case CONVERSATION_STREAM_CHUNK_KINDS.toolCall:
      return toolLineOf(chunk);
    case CONVERSATION_STREAM_CHUNK_KINDS.toolResult:
      // codex reports a tool only once it finishes (no call event), so its result is the one line.
      return hasSeenToolCall ? null : toolLineOf(chunk);
    case CONVERSATION_STREAM_CHUNK_KINDS.usageLimit:
      return 'Usage limit reached';
    default:
      return null;
  }
};

/**
 * @description A line renderer for one run: assistant text, `→ <tool> <short argument>` per tool call, and errors;
 * everything else (session, usage, thinking, tool results) renders nothing. Lines that are not JSON
 * pass through unchanged, as plugin and hook output always has. Stateful, so one per run.
 * @public
 */
export const createStructuredLineRenderer = (
  driverId: string,
): ((line: string) => string | null) => {
  const reader = createStructuredChunkReader(driverId);
  let hasSeenToolCall = false;

  return (line: string): string | null => {
    if (line.trim() === '') {
      return null;
    }

    const event = parseStructuredLine(line);

    if (event === undefined || reader === undefined) {
      return line;
    }

    const chunks = reader(event);

    hasSeenToolCall ||= chunks.some((chunk) => {
      return chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.toolCall;
    });

    const rendered = chunks
      .map((chunk) => {
        return renderChunk(chunk, hasSeenToolCall);
      })
      .filter((text): text is string => {
        return text !== null;
      });

    return rendered.length === 0 ? null : rendered.join('\n');
  };
};

/**
 * @description The same driver, switched to its CLI's structured stream with a matching parser and
 * line renderer. Call it once per run: the renderer holds per-stream state. Claude is returned
 * unchanged — it is always structured and already carries its own parser — as is any driver this
 * package has no mapper for.
 * @public
 */
export const withStructuredOutput = (driver: AgentDriver): AgentDriver => {
  const hasReader = createStructuredChunkReader(driver.id) !== undefined;

  if (driver.id === DRIVERS.claude || !hasReader) {
    return driver;
  }

  return {
    ...driver,
    buildShellCommand: (config) => {
      return driver.buildShellCommand({
        ...config,
        outputFormat: DRIVER_OUTPUT_FORMATS.structured,
      });
    },
    parseOutput: (stdout) => {
      return recoverStructuredText(driver.id, stdout);
    },
    renderOutputLine: createStructuredLineRenderer(driver.id),
  };
};
