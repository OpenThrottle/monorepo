import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RECORDING_PROFILES } from '../../../config/config.backends.ts';
import { PLAN_RUN_SCENARIOS } from '../../../data/data.plan-run-scenarios.ts';
import { TRANSCRIPT_SURFACES } from '../../../types/transcript.ts';
import { planRunTaskId } from '../../plan-run/plan-run-store.ts';
import { parseTranscript } from '../../transcript/transcript.ts';
import { recordPlanRunScenario } from '../record-plan-run-scenario.ts';

let dir: string;

/** A stand-in claude that completes whatever task id its prompt names. */
function writeFakeClaude(): string {
  const path = join(dir, 'fake-claude.mjs');
  writeFileSync(
    path,
    `#!${process.execPath}
const argv = process.argv.slice(2);
if (argv[0] === '--version') {
  process.stdout.write('9.9.9 (Claude Code)\\n');
  process.exit(0);
}
const id = /Current task for this iteration: ([0-9a-f-]{36})/.exec(argv.join(' '))[1];
const result = '<ralph:task-complete>' + id + '</ralph:task-complete>';
process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result }) + '\\n');
`,
    'utf8',
  );
  chmodSync(path, 0o755);
  return path;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'record-plan-run-'));
});

afterEach(() => {
  rmSync(dir, { force: true, recursive: true });
});

describe('recordPlanRunScenario', () => {
  it('records the shell-spawned argv the drivers engine built', async () => {
    const profile = RECORDING_PROFILES.claude;
    const scenario = PLAN_RUN_SCENARIOS.find(
      (candidate) => candidate.slug === 'plan-run-complete',
    );
    if (profile === undefined || scenario === undefined) {
      throw new Error('fixture setup missing');
    }

    const result = await recordPlanRunScenario({
      model: 'sonnet',
      outDir: dir,
      profile,
      realBin: writeFakeClaude(),
      scenario,
    });

    expect(result).toEqual({
      file: join(dir, 'plan-run-complete.ndjson'),
      ok: true,
    });
    const parsed = parseTranscript(
      readFileSync(join(dir, 'plan-run-complete.ndjson'), 'utf8'),
    );
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    expect(parsed.transcript.header.surface).toBe(TRANSCRIPT_SURFACES.planRun);
    expect(parsed.transcript.argv.slice(0, 3)).toEqual([
      '-p',
      '--permission-mode',
      'acceptEdits',
    ]);
    expect(parsed.transcript.argv.join(' ')).toContain(planRunTaskId(0));
  });
});
