#!/usr/bin/env node

/**
 * @description CLI for the snapshot exporter: connect to the REAL workspace
 * database and write the windowed FK-closure snapshot as JSONL per table.
 *
 * Usage (from the repo root, mirroring seed-demo.sh's env handling):
 *
 *   POSTGRES_HOST=localhost pnpm exec tsx --env-file .env \
 *     packages/openthrottle-showroom/src/scripts/snapshot-export.ts [--days 30] [--out <dir>]
 *
 * The inverse of the seed guard: this reads the real workspace, so it REFUSES a
 * database whose name contains 'demo' — snapshotting the demo database would
 * feed the pipeline its own output.
 *
 * Both the rebase anchor and the window cutoff derive from a PINNED constant,
 * not from the clock, so any re-run against unchanged data is byte-identical —
 * see SNAPSHOT_ANCHOR_ISO.
 */

import { fileURLToPath } from 'node:url';

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';

import { exportSnapshot } from '../snapshot/export';
import { createSanitizer } from '../snapshot/sanitize';

const DEFAULT_WINDOW_DAYS = 30;

/**
 * Rebase anchor for every timestamp in the snapshot, pinned rather than derived
 * from the clock, and the exclusive upper edge of the export window (the UTC
 * midnight after the window's last day).
 *
 * This was `new Date()` + 1 day. Because every `created_at`/`updated_at` in the
 * snapshot is stored as `{ $offsetMs }` relative to the anchor, that made the
 * output a function of the calendar: exporting on a different day rewrote all
 * ~18MB of data — 29 files, every line — with no semantic change, and each such
 * export added another whole-snapshot blob to git history.
 *
 * Bump this ONLY when you deliberately intend to move the demo window forward,
 * and expect (and review) the whole-snapshot diff that follows.
 */
const SNAPSHOT_ANCHOR_ISO = '2026-08-29T00:00:00.000Z';

/**
 * Postgres OIDs whose values must stay raw text so the snapshot preserves the
 * database's own serialization byte-for-byte: json/jsonb (and arrays), dates,
 * timestamps and timestamptz (and arrays). Everything else keeps pg defaults.
 */
const RAW_TEXT_OIDS = new Set([
  114, 199, 1082, 1114, 1115, 1182, 1184, 1185, 3802, 3807,
]);

const rawText = (value: string): string => value;

const parseArgs = (argv: string[]): { days: number; outDir: string } => {
  let days = DEFAULT_WINDOW_DAYS;
  let outDir = fileURLToPath(new URL('../snapshot/data', import.meta.url));

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--days') {
      days = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--out') {
      outDir = argv[i + 1];
      i += 1;
    } else {
      console.error(`snapshot-export: unknown argument '${argv[i]}'`);
      process.exit(1);
    }
  }

  if (!Number.isInteger(days) || days <= 0) {
    console.error(`snapshot-export: --days must be a positive integer`);
    process.exit(1);
  }

  return { days, outDir };
};

const main = async (): Promise<void> => {
  const { days, outDir } = parseArgs(process.argv.slice(2));

  const url = new URL(getPostgresUrl());
  const database = url.pathname.replace(/^\//, '');

  if (database.includes('demo')) {
    console.error(
      `snapshot-export: refusing to export database '${database}' — the snapshot must come from the real workspace, not a demo database.`,
    );
    process.exit(1);
  }

  // Anchor and cutoff both hang off the pinned constant, so the only thing that
  // can change the output is the database contents. Every offset stays negative
  // (no "future" activity after seeding) because the anchor is the midnight
  // AFTER the window's last day.
  const anchorIso = SNAPSHOT_ANCHOR_ISO;

  const cutoff = new Date(SNAPSHOT_ANCHOR_ISO);
  cutoff.setUTCDate(cutoff.getUTCDate() - (days + 1));
  const cutoffIso = cutoff.toISOString();

  const client = new pg.Client({
    connectionString: url.toString(),
    types: {
      getTypeParser: (
        oid: number,
        format?: string,
      ): ((value: string) => unknown) => {
        if (RAW_TEXT_OIDS.has(oid)) {
          return rawText;
        }

        const parser =
          format === 'binary'
            ? pg.types.getTypeParser(oid, format)
            : pg.types.getTypeParser(oid);

        return (value: string): unknown => parser(value);
      },
    },
  });

  await client.connect();

  try {
    console.log(
      `snapshot-export: exporting '${database}' since ${cutoffIso} (${days} days) → ${outDir}`,
    );

    const started = Date.now();
    const summaries = await exportSnapshot({
      anchorIso,
      cutoffIso,
      outDir,
      runner: client,
      transformFactory: createSanitizer,
    });

    const widest = Math.max(...summaries.map((entry) => entry.table.length));

    for (const entry of summaries) {
      console.log(
        `  ${entry.table.padEnd(widest)}  ${String(entry.rowCount).padStart(7)}`,
      );
    }

    const total = summaries.reduce((sum, entry) => sum + entry.rowCount, 0);

    console.log(
      `snapshot-export: ${total} rows across ${summaries.length} tables in ${((Date.now() - started) / 1_000).toFixed(1)}s.`,
    );
  } finally {
    await client.end();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
