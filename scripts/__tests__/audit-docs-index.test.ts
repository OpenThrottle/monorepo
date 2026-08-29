import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  auditDocsTree,
  extractLinks,
  resolveDocLink,
} from '../audit-docs-index.ts';

const SCRIPT = fileURLToPath(
  new URL('../audit-docs-index.ts', import.meta.url),
);

const tree = (entries: Record<string, string>): ReadonlyMap<string, string> =>
  new Map(Object.entries(entries));

describe('extractLinks', () => {
  it('pulls every inline link target', () => {
    expect(
      extractLinks('see [one](./one.md) and [two](../two.md "Title")'),
    ).toEqual(['./one.md', '../two.md']);
  });

  it('returns nothing for prose with no links', () => {
    expect(extractLinks('# Heading\n\nJust words.\n')).toEqual([]);
  });
});

describe('resolveDocLink', () => {
  it('resolves a sibling link against the linking doc', () => {
    expect(resolveDocLink('docs/monorepo/NX.md', './tags.md')).toBe(
      'docs/monorepo/tags.md',
    );
  });

  it('resolves a parent-relative link', () => {
    expect(resolveDocLink('docs/monorepo/NX.md', '../README.md')).toBe(
      'docs/README.md',
    );
  });

  it('strips anchors and query strings', () => {
    expect(resolveDocLink('docs/README.md', './a.md#section')).toBe(
      'docs/a.md',
    );
    expect(resolveDocLink('docs/README.md', './a.md?v=1')).toBe('docs/a.md');
  });

  it('ignores external URLs, bare anchors, and non-markdown targets', () => {
    expect(resolveDocLink('docs/README.md', 'https://example.com/a.md')).toBe(
      null,
    );
    expect(resolveDocLink('docs/README.md', '#section')).toBe(null);
    expect(resolveDocLink('docs/README.md', './diagram.svg')).toBe(null);
  });

  it('ignores a link that escapes the docs tree', () => {
    expect(resolveDocLink('docs/README.md', '../CONTRIBUTING.md')).toBe(null);
  });
});

describe('auditDocsTree', () => {
  it('flags a doc no index links to', () => {
    const report = auditDocsTree(
      tree({
        'docs/README.md': '# Docs\n',
        'docs/lonely.md': '# Lonely\n',
      }),
    );

    expect(report.orphans).toEqual(['docs/lonely.md']);
    expect(report.total).toBe(1);
  });

  it('does not flag a doc linked from the root README', () => {
    const report = auditDocsTree(
      tree({
        'docs/README.md': '- [Indexed](./indexed.md)\n',
        'docs/indexed.md': '# Indexed\n',
      }),
    );

    expect(report.orphans).toEqual([]);
    expect(report.reachable).toEqual(['docs/indexed.md']);
  });

  it('treats a directory README as its own seed', () => {
    const report = auditDocsTree(
      tree({
        'docs/README.md': '# Docs\n',
        'docs/marketing/README.md': '- [Format](./format.md)\n',
        'docs/marketing/format.md': '# Format\n',
      }),
    );

    expect(report.orphans).toEqual([]);
    expect(report.seeds).toEqual([
      'docs/README.md',
      'docs/marketing/README.md',
    ]);
  });

  it('reaches one hop past a seed through a hub doc', () => {
    const report = auditDocsTree(
      tree({
        'docs/README.md': '- [Hub](./tools/AGENT_USAGE.md)\n',
        'docs/tools/AGENT_USAGE.md': '- [React](./react.md)\n',
        'docs/tools/react.md': '# React\n',
      }),
    );

    expect(report.orphans).toEqual([]);
  });

  it('stops at one hop — a doc two hops out stays an orphan', () => {
    const report = auditDocsTree(
      tree({
        'docs/README.md': '- [Hub](./hub.md)\n',
        'docs/deep.md': '# Deep\n',
        'docs/hub.md': '- [Mid](./mid.md)\n',
        'docs/mid.md': '- [Deep](./deep.md)\n',
      }),
    );

    expect(report.orphans).toEqual(['docs/deep.md']);
  });

  it('does not let two unindexed docs bootstrap each other', () => {
    const report = auditDocsTree(
      tree({
        'docs/README.md': '# Docs\n',
        'docs/a.md': '- [B](./b.md)\n',
        'docs/b.md': '- [A](./a.md)\n',
      }),
    );

    expect(report.orphans).toEqual(['docs/a.md', 'docs/b.md']);
  });

  it('excuses an allowlisted doc and reports it separately', () => {
    const report = auditDocsTree(
      tree({
        'docs/README.md': '# Docs\n',
        'docs/internal.md': '# Internal\n',
      }),
      ['docs/internal.md'],
    );

    expect(report.orphans).toEqual([]);
    expect(report.allowlisted).toEqual(['docs/internal.md']);
  });

  it('never audits a README as a subject', () => {
    const report = auditDocsTree(
      tree({
        'docs/README.md': '# Docs\n',
        'docs/nested/README.md': '# Nested\n',
      }),
    );

    expect(report.orphans).toEqual([]);
    expect(report.total).toBe(0);
  });
});

describe('the CLI', () => {
  let fixture: string | undefined;

  afterEach(() => {
    if (fixture !== undefined) {
      rmSync(fixture, { force: true, recursive: true });
    }
    fixture = undefined;
  });

  const withOrphan = (): string => {
    const directory = mkdtempSync(path.join(tmpdir(), 'docs-index-'));

    mkdirSync(path.join(directory, 'docs'));
    writeFileSync(path.join(directory, 'docs/README.md'), '# Docs\n');
    writeFileSync(path.join(directory, 'docs/orphan.md'), '# Orphan\n');

    return directory;
  };

  const audit = (cwd: string, ...args: string[]): string =>
    execFileSync('tsx', [SCRIPT, ...args], { cwd, encoding: 'utf-8' });

  it('exits 0 in warn-mode with an orphan present', () => {
    fixture = withOrphan();

    expect(audit(fixture)).toContain('1 orphan(s)');
  });

  it('exits 1 under --strict with an orphan present', () => {
    fixture = withOrphan();
    const directory = fixture;

    expect(() => audit(directory, '--strict')).toThrow();
  });

  it('exits 0 under --strict on a clean tree', () => {
    fixture = mkdtempSync(path.join(tmpdir(), 'docs-index-'));

    mkdirSync(path.join(fixture, 'docs'));
    writeFileSync(
      path.join(fixture, 'docs/README.md'),
      '- [Indexed](./indexed.md)\n',
    );
    writeFileSync(path.join(fixture, 'docs/indexed.md'), '# Indexed\n');

    expect(audit(fixture, '--json')).toContain('"orphans": []');
  });
});
