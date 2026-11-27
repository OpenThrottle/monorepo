/**
 * Record replay transcripts against the locally installed CLI.
 *
 *   pnpm nx run agentic-replay-testing:record -- --backend claude
 *   pnpm nx run agentic-replay-testing:record -- --backend claude --scenario resume,error
 *
 * Flags: --backend <id> (required), --scenario <slug,…> (default: all), --model <id> (default: the profile's), --bin <path>
 * (default: off PATH), --protocol cli|acp (default: cli).
 *
 * Scenarios drive the production conversation backend. `--protocol acp` drives
 * the ACP backend (cursor and antigravity only) and writes to
 * fixtures/<backend>/acp/; `--scenario` then also takes a stem such as
 * `resume.turn-2` (a bare slug records all of the scenario's ACP stems).
 *
 * This spends real tokens on the logged-in account. Transcripts land in
 * fixtures/<backend>/ and are sanitized and leak-checked before writing.
 */

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import type { Scenario } from '../src/index.ts';
import {
  acpTranscriptStems,
  recordAcpScenario,
  RECORDING_PROFILES,
  recordScenario,
  SCENARIOS,
} from '../src/index.ts';

/** Both recorders report the same way. */
type RecordResult =
  | { readonly error: string; readonly ok: false }
  | { readonly files: readonly string[]; readonly ok: true };

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

function resolveBin(name: string): string {
  return execFileSync('which', [name], { encoding: 'utf8' }).trim();
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      backend: { type: 'string' },
      bin: { type: 'string' },
      model: { type: 'string' },
      protocol: { default: 'cli', type: 'string' },
      scenario: { type: 'string' },
    },
  });

  const profile = RECORDING_PROFILES[values.backend ?? ''];
  if (profile === undefined) {
    const known = Object.keys(RECORDING_PROFILES).join(', ');
    process.stderr.write(`--backend must be one of: ${known}\n`);
    return 2;
  }

  if (values.protocol !== 'cli' && values.protocol !== 'acp') {
    process.stderr.write('--protocol must be cli or acp\n');
    return 2;
  }
  const isAcp = values.protocol === 'acp';

  const wanted = values.scenario?.split(',').map((slug) => slug.trim());
  const isWanted = (slug: string): boolean => {
    return wanted === undefined || wanted.includes(slug);
  };
  // For ACP a wanted entry may also be a stem: `<slug>.turn-N`.
  const acpStemsFor = (scenario: Scenario): string[] => {
    return acpTranscriptStems(scenario).filter((stem) => {
      return isWanted(scenario.slug) || isWanted(stem);
    });
  };
  const scenarios = SCENARIOS.filter((scenario) => {
    return isAcp ? acpStemsFor(scenario).length > 0 : isWanted(scenario.slug);
  });
  const model = values.model ?? profile.defaultModel;
  const outDir = isAcp
    ? join(FIXTURES_DIR, profile.backend, 'acp')
    : join(FIXTURES_DIR, profile.backend);
  const realBin = values.bin ?? resolveBin(profile.defaultBin);

  const recordOne = async (scenario: Scenario): Promise<RecordResult> => {
    if (isAcp) {
      return recordAcpScenario({
        model,
        onChunk: undefined,
        outDir,
        profile,
        realBin,
        scenario,
        stems: acpStemsFor(scenario),
      });
    }
    return recordScenario({ model, outDir, profile, realBin, scenario });
  };

  let failures = 0;
  for (const scenario of scenarios) {
    process.stdout.write(`recording ${profile.backend}/${scenario.slug}… `);
    // Recordings run one at a time: they share the CLI's login and rate limit.
    // eslint-disable-next-line no-await-in-loop -- recordings share the CLI's login and rate limit
    const result = await recordOne(scenario);
    if (result.ok) {
      process.stdout.write(`${result.files.length} transcript(s)\n`);
    } else {
      failures += 1;
      process.stdout.write(`FAILED\n  ${result.error}\n`);
    }
  }

  return failures === 0 ? 0 : 1;
}

process.exitCode = await main();
