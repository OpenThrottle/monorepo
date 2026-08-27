/**
 * @description Tests for EditorPresenceResolver: the cached snapshot is projected onto
 * the GraphQL payload verbatim. The resolver must be a pass-through — any "helpful"
 * reinterpretation of `unknown` here would undo the whole point of the three-state
 * result, so that is what is asserted.
 */

import { Test } from '@nestjs/testing';
import type { EditorPresenceResult } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { EditorPresenceResolver } from './editor-presence.resolver';
import { EditorPresenceService } from './editor-presence.service';

const detect = vi.fn();

async function buildResolver(): Promise<EditorPresenceResolver> {
  const app = await Test.createTestingModule({
    providers: [
      EditorPresenceResolver,
      { provide: EditorPresenceService, useValue: { detect } },
    ],
  })
    .overrideGuard(GqlPermissionsGuard)
    .useValue({ canActivate: () => true })
    .compile();

  return app.get(EditorPresenceResolver);
}

beforeEach(() => {
  detect.mockReset();
});

describe('EditorPresenceResolver', () => {
  it('returns every probed editor with its presence and the trusted flag', async () => {
    const snapshot: EditorPresenceResult = {
      editors: [
        { editor: 'cursor', presence: 'installed' },
        { editor: 'vscode', presence: 'not_found' },
      ],
      scannedAt: '2026-08-27T00:00:00.000Z',
      trusted: true,
    };
    detect.mockResolvedValue(snapshot);

    const resolver = await buildResolver();
    const result = await resolver.editorPresence();

    expect(result).toEqual({
      editors: [
        { editor: 'cursor', presence: 'installed' },
        { editor: 'vscode', presence: 'not_found' },
      ],
      scannedAt: '2026-08-27T00:00:00.000Z',
      trusted: true,
    });
  });

  it('surfaces unknown as unknown and never collapses it to not_found', async () => {
    detect.mockResolvedValue({
      editors: [
        { editor: 'cursor', presence: 'unknown' },
        { editor: 'vscode', presence: 'unknown' },
      ],
      scannedAt: '2026-08-27T00:00:00.000Z',
      trusted: false,
    } satisfies EditorPresenceResult);

    const resolver = await buildResolver();
    const result = await resolver.editorPresence();

    expect(result.trusted).toBe(false);
    expect(result.editors.map((editor) => editor.presence)).toEqual([
      'unknown',
      'unknown',
    ]);
  });

  it('never omits an editor, so a client can rely on full coverage', async () => {
    detect.mockResolvedValue({
      editors: [
        { editor: 'cursor', presence: 'unknown' },
        { editor: 'vscode', presence: 'installed' },
      ],
      scannedAt: '2026-08-27T00:00:00.000Z',
      trusted: true,
    } satisfies EditorPresenceResult);

    const resolver = await buildResolver();
    const result = await resolver.editorPresence();

    expect(result.editors.map((editor) => editor.editor)).toEqual([
      'cursor',
      'vscode',
    ]);
  });

  it('reads from the cache rather than probing per request', async () => {
    detect.mockResolvedValue({
      editors: [],
      scannedAt: '2026-08-27T00:00:00.000Z',
      trusted: true,
    } satisfies EditorPresenceResult);

    const resolver = await buildResolver();
    await resolver.editorPresence();
    await resolver.editorPresence();

    // Two requests, two cache reads — the cache decides whether to probe.
    expect(detect).toHaveBeenCalledTimes(2);
  });
});
