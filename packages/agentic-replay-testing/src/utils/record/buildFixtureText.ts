/**
 * Turn a recording shim's capture into committable fixture text: prepend the
 * header, sanitize, drop the profile's host-only lines, and refuse anything the
 * leak check still finds.
 */

import type { RecordingProfile } from '../../config/config.backends.ts';
import type { TranscriptHeader } from '../../types/transcript.ts';
import { replayPaths } from '../replay/replayPaths.ts';
import { findSanitizerLeaks, type Sanitizer } from '../sanitizer/sanitizer.ts';
import {
  parseTranscript,
  serializeTranscript,
} from '../transcript/transcript.ts';

/** @public */
export type FixtureTextResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly text: string };

/**
 * Build the fixture text for one capture recorded in `cwd`. Pass ONE sanitizer
 * for every turn of a scenario, so an id one turn reports and the next sends
 * back maps to the same placeholder in both transcripts.
 *
 * @public
 */
export function buildFixtureText(
  profile: Pick<RecordingProfile, 'dropStdoutLine'>,
  sanitizer: Sanitizer,
  capture: string,
  header: TranscriptHeader,
  cwd: string,
): FixtureTextResult {
  const parsed = parseTranscript(`${JSON.stringify(header)}\n${capture}`);
  if (!parsed.ok) {
    return { error: `capture unreadable: ${parsed.error}`, ok: false };
  }

  const sanitized = sanitizer.sanitizeTranscript(parsed.transcript);
  const text = serializeTranscript({
    ...sanitized,
    header: {
      ...sanitized.header,
      cliVersion: sanitizer.sanitizeText(sanitized.header.cliVersion),
    },
    stdout: sanitized.stdout.filter((line) => !profile.dropStdoutLine(line)),
  });

  const leaks = findSanitizerLeaks(text, {
    forbidden: replayPaths(cwd).map((entry) => entry.path),
  });
  if (leaks.length > 0) {
    return { error: `sanitizer missed: ${leaks.join('; ')}`, ok: false };
  }

  return { ok: true, text };
}
