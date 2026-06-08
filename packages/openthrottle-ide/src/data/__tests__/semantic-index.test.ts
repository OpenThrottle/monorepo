import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EmbeddingsProvider } from '../embeddings.js';
import { indexWorkspace } from '../semantic.js';
import type { StoredChunk, VectorStore } from '../semantic.js';

/** An in-memory {@link VectorStore} that records calls, keyed by chunk id. */
function createMemoryStore(): VectorStore & {
  byId: Map<string, StoredChunk>;
  cleared: number;
} {
  const byId = new Map<string, StoredChunk>();
  let cleared = 0;

  return {
    byId,
    clear: async (): Promise<void> => {
      cleared += 1;
      byId.clear();
    },
    get cleared(): number {
      return cleared;
    },
    deleteByPaths: async (_root, paths): Promise<void> => {
      for (const [id, record] of byId) {
        if (paths.includes(record.chunk.path)) {
          byId.delete(id);
        }
      }
    },
    upsert: async (_root, records): Promise<void> => {
      for (const record of records) {
        byId.set(record.chunk.id, record);
      }
    },
  };
}

/** A provider that returns a deterministic vector per text (no live model). */
function fakeProvider(): EmbeddingsProvider & {
  embed: ReturnType<typeof vi.fn>;
} {
  const embed = vi.fn(async (texts: string[]) =>
    texts.map((text) => [text.length, 0, 0]),
  );
  return { embed };
}

describe('indexWorkspace', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-semantic-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'src', 'a.ts'),
      'export const a = 1;\nexport const b = 2;\n',
    );
    await writeFile(join(root, 'src', 'c.ts'), 'export const c = 3;\n');
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('full mode clears, then chunks + embeds + upserts every file', async () => {
    const store = createMemoryStore();
    const provider = fakeProvider();

    const result = await indexWorkspace({ root }, { provider, store });

    expect(store.cleared).toBe(1);
    expect(result.embedded).toBeGreaterThan(0);
    expect(store.byId.size).toBe(result.embedded);
    // Every stored record carries an embedding from the provider.
    for (const record of store.byId.values()) {
      expect(record.embedding).toHaveLength(3);
    }
    const paths = new Set([...store.byId.values()].map((r) => r.chunk.path));
    expect(paths).toEqual(new Set(['src/a.ts', 'src/c.ts']));
  });

  it('incremental mode re-embeds only added/changed files and deletes removed ones', async () => {
    const store = createMemoryStore();
    const provider = fakeProvider();

    // Seed via a full index, then mutate.
    await indexWorkspace({ root }, { provider, store });
    provider.embed.mockClear();

    // src/a.ts changes, src/c.ts removed, src/d.ts added.
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 11;\n');
    await rm(join(root, 'src', 'c.ts'));
    await writeFile(join(root, 'src', 'd.ts'), 'export const d = 4;\n');

    const result = await indexWorkspace(
      { root },
      {
        diff: {
          added: ['src/d.ts'],
          changed: ['src/a.ts'],
          removed: ['src/c.ts'],
        },
        provider,
        store,
      },
    );

    expect(store.cleared).toBe(1); // not cleared again in incremental mode
    expect(result.deletedPaths).toBe(2); // changed (a) + removed (c)

    const pathsEmbedded = new Set(
      provider.embed.mock.calls.flat(2).map((text: string) => text),
    );
    // Only a.ts and d.ts content was re-embedded; nothing from the untouched set.
    expect([...pathsEmbedded].some((t) => t.includes('a = 11'))).toBe(true);
    expect([...pathsEmbedded].some((t) => t.includes('d = 4'))).toBe(true);

    const storedPaths = new Set(
      [...store.byId.values()].map((r) => r.chunk.path),
    );
    expect(storedPaths.has('src/c.ts')).toBe(false); // removed file purged
    expect(storedPaths.has('src/a.ts')).toBe(true);
    expect(storedPaths.has('src/d.ts')).toBe(true);
  });

  it('embeds in batches sized by embeddingBatchSize', async () => {
    const store = createMemoryStore();
    const provider = fakeProvider();

    await indexWorkspace({ root }, { embeddingBatchSize: 1, provider, store });

    // a.ts yields 2 chunks, c.ts yields 1 → 3 chunks, one per batch.
    expect(provider.embed).toHaveBeenCalledTimes(3);
    for (const call of provider.embed.mock.calls) {
      expect(call[0]).toHaveLength(1);
    }
  });
});
