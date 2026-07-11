/**
 * @description Tests for doc-ingestion diff logic (expandToMarkdownPaths, computeContentHash, computeDocIngestionDiff).
 */

import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import {
  computeContentHash,
  computeDocIngestionDiff,
  expandToMarkdownPaths,
} from '../doc-ingestion-diff';

const connectionString = 'postgres://localhost/openthrottle';

const mockGetPriorState = vi.fn();

vi.mock('../doc-ingestion-state', () => ({
  getPriorState: (...args: unknown[]) => mockGetPriorState(...args),
}));

describe('expandToMarkdownPaths', () => {
  it('returns empty array when payload has no directories or files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'doc-ingest-'));
    try {
      const result = await expandToMarkdownPaths(root, {});
      expect(result).toEqual([]);
    } finally {
      // temp dir cleanup best-effort
    }
  });

  it('returns .md paths under directory, sorted and deduplicated', async () => {
    const root = await mkdtemp(join(tmpdir(), 'doc-ingest-'));
    try {
      await mkdir(join(root, 'docs'), { recursive: true });
      await writeFile(join(root, 'docs', 'a.md'), 'a');
      await writeFile(join(root, 'docs', 'b.md'), 'b');
      const result = await expandToMarkdownPaths(root, {
        directories: ['docs'],
      });
      expect(result).toEqual(['docs/a.md', 'docs/b.md']);
    } finally {
      //
    }
  });

  it('includes explicit files that exist and end in .md', async () => {
    const root = await mkdtemp(join(tmpdir(), 'doc-ingest-'));
    try {
      await writeFile(join(root, 'README.md'), 'readme');
      const result = await expandToMarkdownPaths(root, {
        files: ['README.md'],
      });
      expect(result).toEqual(['README.md']);
    } finally {
      //
    }
  });

  it('deduplicates when file is both under directory and in files list', async () => {
    const root = await mkdtemp(join(tmpdir(), 'doc-ingest-'));
    try {
      await mkdir(join(root, 'docs'), { recursive: true });
      await writeFile(join(root, 'docs', 'only.md'), 'x');
      const result = await expandToMarkdownPaths(root, {
        directories: ['docs'],
        files: ['docs/only.md'],
      });
      expect(result).toEqual(['docs/only.md']);
    } finally {
      //
    }
  });

  it('skips non-.md paths in files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'doc-ingest-'));
    try {
      await writeFile(join(root, 'file.txt'), 'text');
      const result = await expandToMarkdownPaths(root, {
        files: ['file.txt'],
      });
      expect(result).toEqual([]);
    } finally {
      //
    }
  });
});

describe('computeContentHash', () => {
  it('returns SHA-256 hex for file content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'doc-ingest-'));
    try {
      const path = join(root, 'one.md');
      await writeFile(path, 'hello');
      const hash = await computeContentHash(path);
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      // SHA-256 of "hello" is known
      expect(hash).toBe(
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      );
    } finally {
      //
    }
  });

  it('returns undefined when file cannot be read', async () => {
    const hash = await computeContentHash('/nonexistent/path/file.md');
    expect(hash).toBeUndefined();
  });
});

describe('computeDocIngestionDiff', () => {
  it('returns all expanded paths as toAdd when prior state is empty', async () => {
    mockGetPriorState.mockResolvedValueOnce(new Map());
    const root = await mkdtemp(join(tmpdir(), 'doc-ingest-'));
    try {
      await mkdir(join(root, 'docs'), { recursive: true });
      await writeFile(join(root, 'docs', 'new.md'), 'content');
      const diff = await computeDocIngestionDiff({
        connectionString,
        payload: { directories: ['docs'] },
        scope: 'default',
        workspaceRoot: root,
      });
      expect(diff.toAdd).toEqual(['docs/new.md']);
      expect(diff.toUpdate).toEqual([]);
      expect(diff.toRemove).toEqual([]);
    } finally {
      //
    }
  });

  it('returns toUpdate when content hash changed vs prior state', async () => {
    const root = await mkdtemp(join(tmpdir(), 'doc-ingest-'));
    try {
      await mkdir(join(root, 'docs'), { recursive: true });
      const path = join(root, 'docs', 'changed.md');
      await writeFile(path, 'v2');
      const hashV1 =
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'; // "hello"
      mockGetPriorState.mockResolvedValueOnce(
        new Map([
          ['docs/changed.md', { contentHash: hashV1, updatedAt: new Date() }],
        ]),
      );
      const diff = await computeDocIngestionDiff({
        connectionString,
        payload: { directories: ['docs'] },
        scope: 'default',
        workspaceRoot: root,
      });
      expect(diff.toAdd).toEqual([]);
      expect(diff.toUpdate).toEqual(['docs/changed.md']);
      expect(diff.toRemove).toEqual([]);
    } finally {
      //
    }
  });

  it('returns toRemove when path was in prior state but not in expanded set', async () => {
    mockGetPriorState.mockResolvedValueOnce(
      new Map([
        ['docs/gone.md', { contentHash: 'abc', updatedAt: new Date() }],
      ]),
    );
    const root = await mkdtemp(join(tmpdir(), 'doc-ingest-'));
    try {
      await mkdir(join(root, 'docs'), { recursive: true });
      await writeFile(join(root, 'docs', 'kept.md'), 'kept');
      const diff = await computeDocIngestionDiff({
        connectionString,
        payload: { directories: ['docs'] },
        scope: 'default',
        workspaceRoot: root,
      });
      expect(diff.toAdd).toEqual(['docs/kept.md']);
      expect(diff.toUpdate).toEqual([]);
      expect(diff.toRemove).toEqual(['docs/gone.md']);
    } finally {
      //
    }
  });

  it('returns empty toAdd and toUpdate when hashes match prior state', async () => {
    const root = await mkdtemp(join(tmpdir(), 'doc-ingest-'));
    try {
      await mkdir(join(root, 'docs'), { recursive: true });
      await writeFile(join(root, 'docs', 'same.md'), 'unchanged');
      const contentHash = await computeContentHash(
        join(root, 'docs', 'same.md'),
      );
      mockGetPriorState.mockResolvedValueOnce(
        new Map([
          [
            'docs/same.md',
            { contentHash: contentHash!, updatedAt: new Date() },
          ],
        ]),
      );
      const diff = await computeDocIngestionDiff({
        connectionString,
        payload: { directories: ['docs'] },
        scope: 'default',
        workspaceRoot: root,
      });
      expect(diff.toAdd).toEqual([]);
      expect(diff.toUpdate).toEqual([]);
      expect(diff.toRemove).toEqual([]);
    } finally {
      //
    }
  });
});
