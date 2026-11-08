/**
 * Record one scenario by driving the PRODUCTION conversation backend with its
 * `*_BIN` override pointed at the recording shim. The backend builds the argv,
 * scrubs the env and spawns exactly as it does in production; the shim runs the
 * real CLI underneath and captures the traffic. Nothing here rebuilds an argv,
 * so a recorded argv is by construction what production sends.
 */

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ConversationStreamChunk } from '@openthrottle/openthrottle-agentic-utils';

import {
  type RecordingProfile,
  SESSION_STRATEGIES,
} from '../../config/config.backends.ts';
import type { Scenario } from '../../types/scenario.ts';
import {
  TRANSCRIPT_LINE_TYPES,
  TRANSCRIPT_SCHEMA_VERSION,
  TRANSCRIPT_SURFACES,
} from '../../types/transcript.ts';
import { withBinEnv } from '../bin/with-bin-env.ts';
import { writeNodeBin } from '../bin/write-node-bin.ts';
import { replayPaths } from '../replay/replay-paths.ts';
import { createSanitizer } from '../sanitizer/sanitizer.ts';
import {
  advanceConversation,
  type ConversationState,
  driveScenarioTurn,
  initialConversation,
} from '../scenario/drive-turn.ts';
import { transcriptStem } from '../scenario/scenario-run.ts';
import { buildFixtureText } from './fixture-text.ts';

const RECORDING_SHIM_PATH = fileURLToPath(
  new URL('recording-shim.ts', import.meta.url),
);

/** @public */
export interface RecordScenarioOptions {
  /** Model to record with; overridden by a scenario that pins its own. */
  readonly model: string | null;
  /** Directory transcripts are written into, e.g. `fixtures/claude`. */
  readonly outDir: string;
  readonly profile: RecordingProfile;
  /** Absolute path of the real CLI binary. */
  readonly realBin: string;
  readonly scenario: Scenario;
}

/** @public */
export type RecordScenarioResult =
  | { readonly error: string; readonly ok: false }
  | { readonly files: readonly string[]; readonly ok: true };

/** The caller-owned session id, minted against the real CLI when needed. */
async function callerSessionId(
  profile: RecordingProfile,
  cwd: string,
): Promise<string | undefined> {
  if (profile.sessionStrategy !== SESSION_STRATEGIES.caller) {
    return undefined;
  }
  if (profile.mintSession === undefined) {
    return randomUUID();
  }
  return profile.mintSession(cwd);
}

/**
 * Record every turn of a scenario and write one transcript per turn.
 *
 * @public
 */
export async function recordScenario(
  options: RecordScenarioOptions,
): Promise<RecordScenarioResult> {
  const { profile, scenario } = options;
  const cwd = mkdtempSync(join(tmpdir(), 'ot-replay-cwd-'));
  const shimDir = mkdtempSync(join(tmpdir(), 'ot-replay-shim-'));
  const model = scenario.model ?? options.model;
  const cliVersion = execFileSync(options.realBin, [...profile.versionArgs], {
    encoding: 'utf8',
  }).trim();
  // One sanitizer for the whole scenario: a session id turn 1 reports and
  // turn 2 sends back must map to the same placeholder in both transcripts.
  const sanitizer = createSanitizer({
    paths: replayPaths(cwd),
    redactKeys: profile.redactKeys,
  });
  // Held until every check passes, so a failed scenario writes nothing.
  const pending: Array<{ readonly file: string; readonly text: string }> = [];

  try {
    for (const [name, content] of Object.entries(scenario.seedFiles)) {
      mkdirSync(dirname(join(cwd, name)), { recursive: true });
      writeFileSync(join(cwd, name), content, 'utf8');
    }
    mkdirSync(options.outDir, { recursive: true });

    let conversation: ConversationState = initialConversation(
      await callerSessionId(profile, cwd),
    );

    for (const [index, turn] of scenario.turns.entries()) {
      const stem = transcriptStem(scenario, index);
      const capturePath = join(shimDir, `${stem}.capture.ndjson`);
      const bin = writeNodeBin({
        dir: shimDir,
        entry: 'runRecordingShim',
        modulePath: RECORDING_SHIM_PATH,
        name: stem,
        options: { capturePath, realBin: options.realBin },
      });
      const current = conversation;

      // Turns are sequential by nature: a resume turn needs the previous
      // turn's session and reply.
      // eslint-disable-next-line no-await-in-loop
      const chunks: readonly ConversationStreamChunk[] = await withBinEnv(
        profile.binEnv,
        bin,
        async () => {
          return driveScenarioTurn(profile, {
            conversation: current,
            cwd,
            model,
            resolved: { scenario, turn, turnIndex: index },
          });
        },
      );
      conversation = advanceConversation(profile, current, turn, chunks);

      if (!existsSync(capturePath)) {
        return { error: `${stem}: the CLI was never spawned`, ok: false };
      }

      const fixture = buildFixtureText(
        profile,
        sanitizer,
        readFileSync(capturePath, 'utf8'),
        {
          backend: profile.backend,
          cliVersion,
          model,
          recordedAt: new Date().toISOString(),
          scenario: stem,
          schemaVersion: TRANSCRIPT_SCHEMA_VERSION,
          surface: TRANSCRIPT_SURFACES.conversation,
          type: TRANSCRIPT_LINE_TYPES.header,
        },
        cwd,
      );
      if (!fixture.ok) {
        return { error: `${stem}: ${fixture.error}`, ok: false };
      }

      pending.push({
        file: join(options.outDir, `${stem}.ndjson`),
        text: fixture.text,
      });
    }

    const present = scenario.expectAbsentFiles.filter((name) => {
      return existsSync(join(cwd, name));
    });
    if (present.length > 0) {
      return {
        error: `${scenario.slug}: a denied write happened (${present.join(', ')})`,
        ok: false,
      };
    }

    for (const { file, text } of pending) {
      writeFileSync(file, text, 'utf8');
    }
    return { files: pending.map(({ file }) => file), ok: true };
  } finally {
    rmSync(cwd, { force: true, recursive: true });
    rmSync(shimDir, { force: true, recursive: true });
  }
}
