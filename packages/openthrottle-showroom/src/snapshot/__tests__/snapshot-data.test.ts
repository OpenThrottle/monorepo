import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { scanSnapshotText } from '../scan-snapshot';

/**
 * The CI gate over the COMMITTED snapshot: every line of every data file goes
 * through the snapshot leak rules, so a leak string added to
 * `src/snapshot/data/` fails the test target — leak review = code review.
 */
const DATA_DIR = fileURLToPath(new URL('../data', import.meta.url));

describe('snapshot leak rules', () => {
  test('flag a planted secret', () => {
    const findings = scanSnapshotText(
      'fixture',
      '{"content":"key AKIAIOSFODNN7EXAMPLE leaked"}',
    );

    expect(findings.some((finding) => finding.rule === 'secret')).toBe(true);
  });

  test('flag a real email but allow the demo domain and npm scopes', () => {
    expect(
      scanSnapshotText('fixture', 'mail someone@example-company.com'),
    ).toHaveLength(1);
    expect(
      scanSnapshotText('fixture', 'mail ada@atlasworks.example'),
    ).toHaveLength(0);
    expect(
      scanSnapshotText('fixture', 'install @shiftsmartinc/eslint-config/react'),
    ).toHaveLength(0);
  });

  test('flag a real home directory but allow /home/demo', () => {
    expect(scanSnapshotText('fixture', 'cwd /Users/someone/dev')).toHaveLength(
      1,
    );
    expect(
      scanSnapshotText('fixture', 'cwd /home/demo/Development/openthrottle'),
    ).toHaveLength(0);
  });

  test('flag a real hostname but allow the demo hostname', () => {
    expect(
      scanSnapshotText('fixture', 'on Someones-Laptop.local today'),
    ).toHaveLength(1);
    expect(
      scanSnapshotText('fixture', 'on demo-workstation.local today'),
    ).toHaveLength(0);
  });
});

describe('committed snapshot data', () => {
  const files = existsSync(DATA_DIR)
    ? readdirSync(DATA_DIR).filter((entry) => entry.endsWith('.jsonl'))
    : [];

  test('the snapshot directory exists and is populated', () => {
    // If this fails the snapshot was deleted or never refreshed — run
    // `pnpm nx run @openthrottle/openthrottle-showroom:snapshot-refresh`.
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files)(
    '%s is leak-free',
    (file) => {
      const lines = readFileSync(join(DATA_DIR, file), 'utf8').split('\n');
      const findings = lines.flatMap((line, index) =>
        scanSnapshotText(`${file}:${index + 1}`, line),
      );

      expect(findings).toEqual([]);
    },
    30_000,
  );
});
