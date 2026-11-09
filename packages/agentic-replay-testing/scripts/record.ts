/**
 * Record replay transcripts against the locally installed CLI.
 *
 *   pnpm nx run agentic-replay-testing:record -- --backend claude
 *   pnpm nx run agentic-replay-testing:record -- --backend claude --scenario resume,error
 *
 * Flags: --backend <id> (required), --scenario <slug,…> (default: all, across
 * both surfaces), --model <id> (default: the profile's), --bin <path>
 * (default: off PATH).
 *
 * Conversation scenarios drive the production conversation backend; plan-run
 * scenarios (`plan-run-*`) drive the real Ralph orchestrator and drivers engine.
 * A plan-run scenario marked `synthetic` is recorded against its stand-in CLI
 * from scripts/synthetic/ — whatever --bin says — and only for its own backend.
 *
 * This spends real tokens on the logged-in account. Transcripts land in
 * fixtures/<backend>/ and are sanitized and leak-checked before writing.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import {
  PLAN_RUN_SCENARIOS,
  type PlanRunScenarioSynthetic,
  RECORDING_PROFILES,
  recordPlanRunScenario,
  recordScenario,
  SCENARIOS,
  writeNodeBin,
} from '../src/index.ts';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

function resolveBin(name: string): string {
  return execFileSync('which', [name], { encoding: 'utf8' }).trim();
}

/**
 * Install a scenario's stand-in CLI as an executable. Every module under
 * scripts/synthetic/ exports `runSyntheticCli`.
 */
function writeSyntheticBin(synthetic: PlanRunScenarioSynthetic): string {
  return writeNodeBin({
    dir: mkdtempSync(join(tmpdir(), 'ot-replay-synthetic-')),
    entry: 'runSyntheticCli',
    modulePath: join(import.meta.dirname, 'synthetic', `${synthetic.bin}.ts`),
    name: synthetic.bin,
    options: {},
  });
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      backend: { type: 'string' },
      bin: { type: 'string' },
      model: { type: 'string' },
      scenario: { type: 'string' },
    },
  });

  const profile = RECORDING_PROFILES[values.backend ?? ''];
  if (profile === undefined) {
    const known = Object.keys(RECORDING_PROFILES).join(', ');
    process.stderr.write(`--backend must be one of: ${known}\n`);
    return 2;
  }

  const wanted = values.scenario?.split(',').map((slug) => slug.trim());
  const isWanted = (slug: string): boolean => {
    return wanted === undefined || wanted.includes(slug);
  };
  const scenarios = SCENARIOS.filter((scenario) => isWanted(scenario.slug));
  const planRunScenarios = PLAN_RUN_SCENARIOS.filter((scenario) => {
    const isOtherBackend =
      scenario.synthetic !== null &&
      scenario.synthetic.backend !== profile.backend;
    return isWanted(scenario.slug) && !isOtherBackend;
  });
  const model = values.model ?? profile.defaultModel;
  const outDir = join(FIXTURES_DIR, profile.backend);
  const realBin = values.bin ?? resolveBin(profile.defaultBin);

  let failures = 0;
  for (const scenario of scenarios) {
    process.stdout.write(`recording ${profile.backend}/${scenario.slug}… `);
    // Recordings run one at a time: they share the CLI's login and rate limit.
    // eslint-disable-next-line no-await-in-loop
    const result = await recordScenario({
      model,
      outDir,
      profile,
      realBin,
      scenario,
    });
    if (result.ok) {
      process.stdout.write(`${result.files.length} transcript(s)\n`);
    } else {
      failures += 1;
      process.stdout.write(`FAILED\n  ${result.error}\n`);
    }
  }

  for (const scenario of planRunScenarios) {
    process.stdout.write(`recording ${profile.backend}/${scenario.slug}… `);
    const { synthetic } = scenario;
    const scenarioBin = synthetic ? writeSyntheticBin(synthetic) : realBin;
    // eslint-disable-next-line no-await-in-loop
    const result = await recordPlanRunScenario({
      model,
      outDir,
      profile,
      realBin: scenarioBin,
      scenario,
    });
    if (result.ok) {
      process.stdout.write('1 transcript(s)\n');
    } else {
      failures += 1;
      process.stdout.write(`FAILED\n  ${result.error}\n`);
    }
  }

  return failures === 0 ? 0 : 1;
}

process.exitCode = await main();
