/**
 * Re-record every scenario against the locally installed CLIs and compare each
 * fresh transcript with its committed one (see `compareTranscripts`). Prints a
 * Markdown report and exits 1 when any committed transcript has drifted or can
 * no longer be recorded.
 *
 *   pnpm nx run agentic-replay-testing:check-drift
 *   pnpm nx run agentic-replay-testing:check-drift -- --backend codex,cursor --json drift.json
 *
 * Spends real tokens on every logged-in account. Never writes to fixtures/:
 * refreshing a transcript is a deliberate `record` run reviewed in a PR.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import {
  compareTranscripts,
  type DriftFinding,
  parseTranscript,
  PLAN_RUN_SCENARIOS,
  RECORDING_PROFILES,
  type RecordingProfile,
  recordPlanRunScenario,
  recordScenario,
  SCENARIOS,
} from '../src/index.ts';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

interface StemReport {
  readonly backend: string;
  readonly findings: readonly DriftFinding[];
  readonly note: string | null;
  readonly stem: string;
}

interface BackendReport {
  readonly backend: string;
  readonly committedVersion: string | null;
  readonly freshVersion: string | null;
  readonly skipped: string | null;
  readonly stems: readonly StemReport[];
}

function resolveBin(name: string): string | null {
  try {
    return execFileSync('which', [name], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function listStems(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith('.ndjson'))
    .map((name) => name.replace(/\.ndjson$/, ''))
    .sort();
}

function readTranscript(path: string): ReturnType<typeof parseTranscript> {
  return parseTranscript(readFileSync(path, 'utf8'));
}

async function recordAll(
  profile: RecordingProfile,
  realBin: string,
  outDir: string,
): Promise<Map<string, string>> {
  const failures = new Map<string, string>();
  const model = profile.defaultModel;

  for (const scenario of SCENARIOS) {
    // Sequential: recordings share one login and rate limit per CLI.
    // eslint-disable-next-line no-await-in-loop
    const result = await recordScenario({
      model,
      outDir,
      profile,
      realBin,
      scenario,
    });
    if (!result.ok) {
      failures.set(scenario.slug, result.error);
    }
  }
  for (const scenario of PLAN_RUN_SCENARIOS) {
    // eslint-disable-next-line no-await-in-loop
    const result = await recordPlanRunScenario({
      model,
      outDir,
      profile,
      realBin,
      scenario,
    });
    if (!result.ok) {
      failures.set(scenario.slug, result.error);
    }
  }

  return failures;
}

async function checkBackend(profile: RecordingProfile): Promise<BackendReport> {
  const committedDir = join(FIXTURES_DIR, profile.backend);
  const committed = listStems(committedDir);
  const realBin = resolveBin(profile.defaultBin);
  const base = {
    backend: profile.backend,
    committedVersion: null,
    freshVersion: null,
  };

  if (committed.length === 0) {
    return { ...base, skipped: 'no committed transcripts', stems: [] };
  }
  if (realBin === null) {
    return {
      ...base,
      skipped: `${profile.defaultBin} is not installed`,
      stems: [],
    };
  }

  const outDir = mkdtempSync(join(tmpdir(), `ot-drift-${profile.backend}-`));
  try {
    const failures = await recordAll(profile, realBin, outDir);
    const fresh = new Set(listStems(outDir));
    const stems: StemReport[] = [];
    let committedVersion: string | null = null;
    let freshVersion: string | null = null;

    for (const stem of committed) {
      const before = readTranscript(join(committedDir, `${stem}.ndjson`));
      if (!before.ok) {
        stems.push({
          backend: profile.backend,
          findings: [],
          note: `committed transcript unreadable: ${before.error}`,
          stem,
        });
        continue;
      }
      committedVersion = before.transcript.header.cliVersion;
      if (!fresh.has(stem)) {
        const slug = stem.replace(/\.turn-\d+$/, '');
        const reason = failures.get(slug) ?? 'not produced';
        stems.push({
          backend: profile.backend,
          findings: [{ detail: reason, kind: 'exit' }],
          note: 'could not be re-recorded',
          stem,
        });
        continue;
      }
      const after = readTranscript(join(outDir, `${stem}.ndjson`));
      if (!after.ok) {
        stems.push({
          backend: profile.backend,
          findings: [],
          note: `fresh transcript unreadable: ${after.error}`,
          stem,
        });
        continue;
      }
      freshVersion = after.transcript.header.cliVersion;
      const comparison = compareTranscripts(
        before.transcript,
        after.transcript,
      );
      stems.push({
        backend: profile.backend,
        findings: comparison.findings,
        note: null,
        stem,
      });
    }

    for (const stem of fresh) {
      if (!committed.includes(stem)) {
        stems.push({
          backend: profile.backend,
          findings: [],
          note: 'new: records now but is not committed',
          stem,
        });
      }
    }

    return { ...base, committedVersion, freshVersion, skipped: null, stems };
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
}

function toMarkdown(reports: readonly BackendReport[]): string {
  const lines = ['# Replay fixture drift', ''];
  for (const report of reports) {
    lines.push(`## ${report.backend}`, '');
    if (report.skipped !== null) {
      lines.push(`Skipped: ${report.skipped}.`, '');
      continue;
    }
    lines.push(
      `CLI version: committed \`${report.committedVersion ?? '?'}\`, installed \`${report.freshVersion ?? '?'}\`.`,
      '',
    );
    const drifted = report.stems.filter(
      (stem) => stem.findings.length > 0 || stem.note !== null,
    );
    if (drifted.length === 0) {
      lines.push('No drift.', '');
      continue;
    }
    for (const stem of drifted) {
      lines.push(
        `- \`${stem.stem}\`${stem.note === null ? '' : ` — ${stem.note}`}`,
      );
      for (const finding of stem.findings) {
        lines.push(`  - **${finding.kind}**: ${finding.detail}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: { backend: { type: 'string' }, json: { type: 'string' } },
  });
  const wanted = values.backend?.split(',').map((id) => id.trim());
  const profiles = Object.values(RECORDING_PROFILES).filter((profile) => {
    return wanted === undefined || wanted.includes(profile.backend);
  });

  const reports: BackendReport[] = [];
  for (const profile of profiles) {
    process.stderr.write(`checking ${profile.backend}…\n`);
    // eslint-disable-next-line no-await-in-loop
    reports.push(await checkBackend(profile));
  }

  process.stdout.write(`${toMarkdown(reports)}\n`);
  if (values.json !== undefined) {
    writeFileSync(values.json, `${JSON.stringify(reports, null, 2)}\n`, 'utf8');
  }

  const drifted = reports.some((report) => {
    return report.stems.some((stem) => stem.findings.length > 0);
  });
  return drifted ? 1 : 0;
}

process.exitCode = await main();
