/**
 * Shared readers for replay tests: what a backend streamed, reduced to the
 * facts a test asserts on. Not a test file — the coverage guard only counts
 * literal `replayFixturePath(...)` calls in the test files themselves.
 */

import type { ConversationStreamChunk } from '@openthrottle/agentic-conversation-backend';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '@openthrottle/agentic-conversation-backend';
import { expect } from 'vitest';

import type {
  ReplayAcpFixtureOptions,
  ReplayAcpFixtureResult,
  ReplayFixtureResult,
  ReplayProfile,
} from '../../src/index.ts';
import { replayAcpFixture, replayFixture } from '../../src/index.ts';

/** Replay through `profile`, asserting the bin matched the argv strictly. */
export async function replayStrict(
  profile: ReplayProfile,
  fixturePath: string,
): Promise<ReplayFixtureResult> {
  const result = await replayFixture({ fixturePath, profile });
  expect(result.report).toEqual({ ok: true });
  return result;
}

export function ofKind(
  chunks: readonly ConversationStreamChunk[],
  kind: ConversationStreamChunk['kind'],
): ConversationStreamChunk[] {
  return chunks.filter((chunk) => chunk.kind === kind);
}

export function textOf(chunks: readonly ConversationStreamChunk[]): string {
  return ofKind(chunks, CONVERSATION_STREAM_CHUNK_KINDS.text)
    .map((chunk) => chunk.delta)
    .join('');
}

export function terminal(
  chunks: readonly ConversationStreamChunk[],
): ConversationStreamChunk | undefined {
  return chunks.findLast((chunk) => chunk.done);
}

export function countOf(
  chunks: readonly ConversationStreamChunk[],
  kind: ConversationStreamChunk['kind'],
): number {
  return ofKind(chunks, kind).length;
}

/**
 * Replay an ACP transcript through a fresh production ACP backend, asserting
 * the replay bin matched every client frame and that its process ended.
 * `turn` picks one turn's chunks from a multi-turn transcript.
 */
export async function replayAcpStrict(
  fixturePath: string,
  onChunk: ReplayAcpFixtureOptions['onChunk'] = undefined,
): Promise<ReplayAcpFixtureResult> {
  const result = await replayAcpFixture({
    fixturePath,
    idleTtlMs: undefined,
    onChunk,
  });
  expect(result.report).toEqual({ ok: true });
  expect(result.exited).toBe(true);
  return result;
}

/** The chunks of turn `index` (0-based) of an ACP replay. */
export function turnChunks(
  result: ReplayAcpFixtureResult,
  index: number,
): readonly ConversationStreamChunk[] {
  return result.chunks[index] ?? [];
}

/** Kinds in stream order, with consecutive repeats collapsed. */
export function kindsOf(chunks: readonly ConversationStreamChunk[]): string[] {
  return chunks
    .map((chunk) => chunk.kind)
    .filter((kind, index, all) => kind !== all[index - 1]);
}
