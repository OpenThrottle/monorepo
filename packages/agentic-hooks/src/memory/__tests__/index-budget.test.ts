import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BUDGET,
  formatBudgetReport,
  INFERRED_INJECTION_CAP,
  measureIndex,
  parseIndexEntries,
  reportIndexBudget,
} from '../index-budget';

/** Build an index of `count` entries, each padded to a predictable width. */
const buildIndex = (count: number, hookWidth = 40): string => {
  const lines = ['# Memory index', ''];
  for (let i = 0; i < count; i += 1) {
    const slug = `entry-${String(i).padStart(3, '0')}`;
    lines.push(`- [Entry ${i}](${slug}.md) — ${'x'.repeat(hookWidth)}`);
  }
  return `${lines.join('\n')}\n`;
};

describe('measureIndex', () => {
  it('counts characters, not bytes', () => {
    // The recorded failure diverged by 400+ characters this way: a guard that
    // counted bytes would have measured a different file than the loader does.
    const multibyte = '— “quoted” →';
    expect(measureIndex(multibyte)).toBe(multibyte.length);
    expect(Buffer.byteLength(multibyte, 'utf8')).toBeGreaterThan(
      measureIndex(multibyte),
    );
  });
});

describe('the enforced budget', () => {
  it('sits below the inferred cap so a lower real cap is still caught', () => {
    expect(DEFAULT_BUDGET).toBeLessThan(INFERRED_INJECTION_CAP);
  });

  it('infers the cap that renders as the observed "24.4KB"', () => {
    expect((INFERRED_INJECTION_CAP / 1024).toFixed(1)).toBe('24.4');
  });
});

describe('parseIndexEntries', () => {
  it('reads title and file from each pointer line and ignores prose', () => {
    const entries = parseIndexEntries(
      [
        '# Memory index',
        '',
        'Some prose that is not an entry.',
        '- [First thing](first-thing.md) — a hook',
        '- [Second thing](second-thing.md) — another hook',
      ].join('\n'),
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      file: 'first-thing.md',
      line: 4,
      title: 'First thing',
    });
    expect(entries[1]).toMatchObject({ file: 'second-thing.md', line: 5 });
  });
});

describe('reportIndexBudget', () => {
  it('reports nothing lost when the index fits', () => {
    const report = reportIndexBudget(buildIndex(10), 10_000);

    expect(report.overBudget).toBe(false);
    expect(report.lost).toEqual([]);
    expect(report.overBy).toBe(0);
    expect(report.kept).toHaveLength(10);
  });

  it('names the entries past the cut, not just the overage', () => {
    const content = buildIndex(50);
    const report = reportIndexBudget(content, 1_000);

    expect(report.overBudget).toBe(true);
    expect(report.lost.length).toBeGreaterThan(0);
    expect(report.kept.length + report.lost.length).toBe(50);

    // Positional eviction: the tail goes, so the LAST entry is always among the
    // lost. This is the inverted policy the guard exists to surface.
    expect(report.lost.at(-1)?.file).toBe('entry-049.md');
  });

  it('cuts at a whole line, never mid-entry', () => {
    const content = buildIndex(50);
    const report = reportIndexBudget(content, 1_000);

    // Every kept entry ends at or before the cut; the first lost entry starts
    // after it. If the loader cut mid-line an entry would appear in both.
    const keptFiles = new Set(report.kept.map((entry) => entry.file));
    for (const lost of report.lost) {
      expect(keptFiles.has(lost.file)).toBe(false);
    }
  });

  it('reproduces the recorded failure: one entry lost off the end', () => {
    // The real event: a 25,022-character file against a 25,000-character cap cut
    // at 24,870 — the last line boundary below the cap — dropping exactly the
    // final entry. Reconstructed to the same shape rather than asserting on a
    // file that no longer exists.
    const body = `${'# Memory index\n'}${'- [Filler](filler.md) — x\n'.repeat(900)}`;
    const content = `${body}- [No-attribution guard plan](no-attribution-guard-plan.md) — OT d33439fa PENDING\n`;
    const budget = content.length - 10;

    const report = reportIndexBudget(content, budget);

    expect(report.overBudget).toBe(true);
    expect(report.lost).toHaveLength(1);
    expect(report.lost[0]?.title).toBe('No-attribution guard plan');
    expect(report.lost[0]?.file).toBe('no-attribution-guard-plan.md');
  });

  it('handles a budget so small nothing survives whole', () => {
    const report = reportIndexBudget(buildIndex(5), 3);

    expect(report.overBudget).toBe(true);
    expect(report.kept).toEqual([]);
    expect(report.lost).toHaveLength(5);
  });

  it('reports overflow that is trailing prose rather than entries', () => {
    const content = `${buildIndex(3)}${'trailing prose line\n'.repeat(50)}`;
    const report = reportIndexBudget(content, buildIndex(3).length + 5);

    expect(report.overBudget).toBe(true);
    expect(report.lost).toEqual([]);
  });
});

describe('formatBudgetReport', () => {
  it('is empty when nothing would be lost', () => {
    expect(formatBudgetReport(reportIndexBudget(buildIndex(3), 10_000))).toBe(
      '',
    );
  });

  it('names each lost entry and its file when the list is short', () => {
    const content = buildIndex(10);
    const report = reportIndexBudget(content, content.length - 200);
    const message = formatBudgetReport(report);

    expect(report.lost.length).toBeGreaterThan(0);
    expect(message).toContain(`over the ${report.budget}-character budget`);
    for (const lost of report.lost) {
      expect(message).toContain(lost.title);
      expect(message).toContain(lost.file);
    }
  });

  it('says the write will appear to succeed', () => {
    const message = formatBudgetReport(
      reportIndexBudget(buildIndex(50), 1_000),
    );

    // The author's mental model is "the write errored or it worked". Neither is
    // true, and the message has to say so or it will be read as a size nag.
    expect(message).toContain('truncates');
    expect(message).toMatch(/appear to succeed/);
  });

  it('says the overflow is trailing prose when no entry is past the cut', () => {
    const content = `${buildIndex(3)}${'trailing prose line\n'.repeat(50)}`;
    const message = formatBudgetReport(
      reportIndexBudget(content, buildIndex(3).length + 5),
    );

    expect(message).toContain('trailing prose');
  });
});

describe('formatBudgetReport output length', () => {
  it('names the newest lost entries and counts off the rest', () => {
    // A badly over-budget index can put hundreds past the cut. A message that
    // long is skimmed, which would bury the signal it exists to deliver.
    const report = reportIndexBudget(buildIndex(400), 1_000);
    const message = formatBudgetReport(report);

    expect(report.lost.length).toBeGreaterThan(100);
    expect(message.split('\n').length).toBeLessThan(30);
    expect(message).toContain('earlier entries');
    // The newest entry is the one most likely to matter, and it is last.
    expect(message).toContain('entry-399.md');
  });

  it('names every entry when few enough are lost', () => {
    const report = reportIndexBudget(
      buildIndex(12),
      buildIndex(12).length - 60,
    );
    const message = formatBudgetReport(report);

    expect(report.lost.length).toBeLessThanOrEqual(15);
    expect(message).not.toContain('earlier entries');
    for (const lost of report.lost) {
      expect(message).toContain(lost.file);
    }
  });
});
