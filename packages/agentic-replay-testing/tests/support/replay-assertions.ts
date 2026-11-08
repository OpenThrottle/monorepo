/**
 * Shared readers for replay tests: what a backend streamed, reduced to the
 * facts a test asserts on. Not a test file — the coverage guard only counts
 * literal `replayFixturePath(...)` calls in the test files themselves.
 */

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationStreamChunk,
} from '@openthrottle/openthrottle-agentic-utils';
import { expect } from 'vitest';

import {
  replayFixture,
  type ReplayFixtureResult,
  type ReplayProfile,
} from '../../src/index.ts';

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
