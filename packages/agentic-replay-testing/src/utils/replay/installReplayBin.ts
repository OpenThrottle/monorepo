/**
 * Install a replay bin for one transcript in a fresh temp directory.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Transcript } from '../../types/transcript.ts';
import { writeNodeBin } from '../bin/writeNodeBin.ts';
import { parseTranscript } from '../transcript/transcript.ts';
import type { ReplayReport } from './replay-bin.ts';

const REPLAY_BIN_PATH = fileURLToPath(
  new URL('replay-bin.ts', import.meta.url),
);

/** @public */
export interface ReplayBin {
  /** Absolute path to set as the backend's `*_BIN`. */
  readonly bin: string;
  /** Remove the bin and its report. */
  readonly dispose: () => void;
  /**
   * What the last run observed, or null when the bin never ran — which itself
   * means the backend did not spawn through its `*_BIN` override.
   */
  readonly readReport: () => ReplayReport | null;
  readonly transcript: Transcript;
}

function isReplayReport(value: unknown): value is ReplayReport {
  return typeof value === 'object' && value !== null && 'ok' in value;
}

/**
 * Write a replay bin for the transcript at `transcriptPath`. Throws when the
 * transcript is unreadable: that is a broken fixture, not a test outcome.
 *
 * @public
 */
export function installReplayBin(transcriptPath: string): ReplayBin {
  const parsed = parseTranscript(readFileSync(transcriptPath, 'utf8'));
  if (!parsed.ok) {
    throw new Error(`${transcriptPath}: ${parsed.error}`);
  }

  const dir = mkdtempSync(join(tmpdir(), 'ot-replay-bin-'));
  const reportPath = join(dir, 'report.json');
  const bin = writeNodeBin({
    dir,
    entry: 'runReplayBin',
    modulePath: REPLAY_BIN_PATH,
    name: parsed.transcript.header.backend,
    options: { reportPath, transcriptPath },
  });

  const readReport = (): ReplayReport | null => {
    if (!existsSync(reportPath)) {
      return null;
    }
    const value: unknown = JSON.parse(readFileSync(reportPath, 'utf8'));
    return isReplayReport(value) ? value : null;
  };

  return {
    bin,
    dispose: () => rmSync(dir, { force: true, recursive: true }),
    readReport,
    transcript: parsed.transcript,
  };
}
