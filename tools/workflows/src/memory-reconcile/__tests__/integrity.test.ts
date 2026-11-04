import { describe, expect, it } from 'vitest';

import { checkIndexIntegrity, formatIntegrityReport } from '../integrity';

const run = (input: {
  archives?: ReadonlyMap<string, string>;
  fileContents?: ReadonlyMap<string, string>;
  files: readonly string[];
  indexContent: string;
}) =>
  checkIndexIntegrity({
    archives: input.archives ?? new Map(),
    fileContents: input.fileContents ?? new Map(),
    files: input.files,
    indexContent: input.indexContent,
    indexName: 'MEMORY.md',
  });

describe('checkIndexIntegrity', () => {
  it('is clean when every file is linked and every link resolves', () => {
    const report = run({
      files: ['MEMORY.md', 'a.md', 'b.md'],
      indexContent: '- [A](a.md) — x\n- [B](b.md) — y\n',
    });

    expect(report.orphans).toEqual([]);
    expect(report.brokenLinks).toEqual([]);
  });

  it('catches the rewrite bug: a file on disk reachable from nothing', () => {
    // The recorded failure — a bulk index rewrite dropped four entries. The
    // files stayed, nothing errored, and they stopped being reachable. A
    // links-only check would have passed this cleanly.
    const report = run({
      files: ['MEMORY.md', 'a.md', 'dropped.md'],
      indexContent: '- [A](a.md) — x\n',
    });

    expect(report.orphans.map((issue) => issue.file)).toEqual(['dropped.md']);
    expect(report.brokenLinks).toEqual([]);
  });

  it('catches the rename bug: a pointer to a file that is not there', () => {
    const report = run({
      files: ['MEMORY.md', 'a.md'],
      indexContent: '- [A](a.md) — x\n- [Gone](gone.md) — y\n',
    });

    expect(report.brokenLinks.map((issue) => issue.file)).toEqual(['gone.md']);
    expect(report.brokenLinks[0]?.source).toBe('MEMORY.md');
  });

  it('treats a file linked only from an archive as reachable', () => {
    // Demotion moves a pointer from the index to the archive. If the archive did
    // not count, every demotion would immediately report as an orphan and the
    // check would fight the very routine it is meant to make safe.
    const report = run({
      archives: new Map([['landed-plans-archive.md', '- [Old](old.md)']]),
      files: ['MEMORY.md', 'landed-plans-archive.md', 'old.md'],
      indexContent: '- [Archive](landed-plans-archive.md) — demoted plans\n',
    });

    expect(report.orphans).toEqual([]);
  });

  it('never reports the index or an archive as an orphan', () => {
    const report = run({
      archives: new Map([['landed-plans-archive.md', '']]),
      files: ['MEMORY.md', 'landed-plans-archive.md'],
      indexContent: '',
    });

    expect(report.orphans).toEqual([]);
  });

  it('treats the children of an index-linked hub as reachable', () => {
    // The video/showroom consolidation: nine plan files moved out of the index
    // into one topic file that the index links. Every child is still one link
    // away from the index, so none of them is lost.
    const report = run({
      fileContents: new Map([
        [
          'video-showroom-workstream.md',
          '- [Video plan](youtube-0-60-video-plan.md) — x\n- [TTS](elevenlabs-tts-spike-plan.md) — y\n',
        ],
      ]),
      files: [
        'MEMORY.md',
        'elevenlabs-tts-spike-plan.md',
        'video-showroom-workstream.md',
        'youtube-0-60-video-plan.md',
      ],
      indexContent: '- [Video hub](video-showroom-workstream.md) — 9 plans\n',
    });

    expect(report.orphans).toEqual([]);
    expect(report.brokenLinks).toEqual([]);
    expect(report.totalLinks).toBe(3);
  });

  it('follows exactly one hop: a hub linked only from a hub is not followed', () => {
    const report = run({
      fileContents: new Map([
        ['hub.md', '- [Nested](nested-hub.md)'],
        ['nested-hub.md', '- [Deep](deep.md)'],
      ]),
      files: ['MEMORY.md', 'deep.md', 'hub.md', 'nested-hub.md'],
      indexContent: '- [Hub](hub.md)\n',
    });

    expect(report.orphans.map((issue) => issue.file)).toEqual(['deep.md']);
  });

  it('does not treat a file the index never links as a hub', () => {
    // Links inside an orphan must not rescue other orphans, or two dropped
    // files pointing at each other would both read as reachable.
    const report = run({
      fileContents: new Map([['dropped.md', '- [Other](other.md)']]),
      files: ['MEMORY.md', 'dropped.md', 'other.md'],
      indexContent: '',
    });

    expect(report.orphans.map((issue) => issue.file)).toEqual([
      'dropped.md',
      'other.md',
    ]);
  });

  it('attributes a broken link inside a hub to that hub', () => {
    const report = run({
      fileContents: new Map([['hub.md', '- [Renamed](renamed.md)']]),
      files: ['MEMORY.md', 'hub.md'],
      indexContent: '- [Hub](hub.md)\n',
    });

    expect(report.brokenLinks).toEqual([
      { file: 'renamed.md', source: 'hub.md' },
    ]);
  });

  it('ignores URLs and paths outside the memory directory', () => {
    const report = run({
      files: ['MEMORY.md'],
      indexContent:
        '- [Doc](https://example.com/a.md) — x\n- [Repo](../docs/b.md) — y\n',
    });

    expect(report.brokenLinks).toEqual([]);
  });
});

describe('formatIntegrityReport', () => {
  it('says "none" explicitly rather than printing nothing', () => {
    const text = formatIntegrityReport(
      run({ files: ['MEMORY.md'], indexContent: '' }),
    );

    // Silence and success must not look the same.
    expect(text).toContain('orphans:      none');
    expect(text).toContain('broken links: none');
  });

  it('names each orphan and each broken link with its source', () => {
    const text = formatIntegrityReport(
      run({
        files: ['MEMORY.md', 'dropped.md'],
        indexContent: '- [Gone](gone.md) — y\n',
      }),
    );

    expect(text).toContain('dropped.md');
    expect(text).toContain('gone.md (linked from MEMORY.md)');
  });
});
