/**
 * Install an ACP replay bin for one ACP transcript in a fresh temp directory.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sleep } from '@openthrottle/nodejs-utils';

import { RECORDING_PROFILES } from '../config/config.backends.ts';
import type { AcpTranscript } from '../types/transcript.ts';
import { TRANSCRIPT_PROTOCOLS } from '../types/transcript.ts';
import { acpRedactKeys } from './acp-normalize.ts';
import type { ReplayReport } from './replay-bin.ts';
import { writeNodeBin } from './stub-bin.ts';
import { parseTranscript } from './transcript.ts';

const ACP_REPLAY_BIN_PATH = fileURLToPath(
  new URL('acp-replay-bin.ts', import.meta.url),
);

const EXIT_POLL_MS = 50;

/** @public */
export interface AcpReplayBin {
  /** Absolute path to set as the spec's `binEnv`. */
  readonly bin: string;
  /** Remove the bin and its report. */
  readonly dispose: () => void;
  /**
   * What the replay observed so far, or null when it never ran. It always
   * names the next client frame the transcript still expects until the
   * script is complete.
   */
  readonly readReport: () => ReplayReport | null;
  readonly transcript: AcpTranscript;
  /** Resolve true once the replay process has exited, false on timeout. */
  readonly waitForExit: (timeoutMs: number) => Promise<boolean>;
}

function isReplayReport(value: unknown): value is ReplayReport {
  return typeof value === 'object' && value !== null && 'ok' in value;
}

/**
 * Write a replay bin for the ACP transcript at `transcriptPath`. Throws when
 * it is unreadable or is not an ACP transcript: a broken fixture, not a test
 * outcome.
 *
 * @public
 */
export function installAcpReplayBin(
  transcriptPath: string,
  redactKeys: readonly string[] | undefined = undefined,
): AcpReplayBin {
  const parsed = parseTranscript(readFileSync(transcriptPath, 'utf8'));
  if (!parsed.ok) {
    throw new Error(`${transcriptPath}: ${parsed.error}`);
  }
  const { transcript } = parsed;
  if (transcript.protocol !== TRANSCRIPT_PROTOCOLS.acp) {
    throw new Error(`${transcriptPath}: not an acp transcript`);
  }

  const profile = RECORDING_PROFILES[transcript.header.backend];
  const dir = mkdtempSync(join(tmpdir(), 'ot-acp-replay-bin-'));
  const reportPath = join(dir, 'report.json');
  const exitPath = join(dir, 'exit.json');
  const bin = writeNodeBin({
    dir,
    entry: 'runAcpReplayBin',
    modulePath: ACP_REPLAY_BIN_PATH,
    name: transcript.header.backend,
    options: {
      exitPath,
      redactKeys: acpRedactKeys(redactKeys ?? profile?.redactKeys ?? []),
      reportPath,
      transcriptPath,
    },
  });

  const readReport = (): ReplayReport | null => {
    if (!existsSync(reportPath)) {
      return null;
    }
    const value: unknown = JSON.parse(readFileSync(reportPath, 'utf8'));
    return isReplayReport(value) ? value : null;
  };

  const waitForExit = async (timeoutMs: number): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (!existsSync(exitPath) && Date.now() < deadline) {
      // eslint-disable-next-line no-await-in-loop -- polling for the exit file
      await sleep(EXIT_POLL_MS);
    }
    return existsSync(exitPath);
  };

  return {
    bin,
    dispose: () => rmSync(dir, { force: true, recursive: true }),
    readReport,
    transcript,
    waitForExit,
  };
}
