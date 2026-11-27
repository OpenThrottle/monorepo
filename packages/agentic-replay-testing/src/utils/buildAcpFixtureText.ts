/**
 * Turn an ACP recording shim's capture into committable fixture text: prepend
 * the header, require an ACP transcript, and refuse anything the leak check
 * still finds. The shim already sanitized and normalized every frame.
 */

import type { TranscriptHeader } from '../types/transcript.ts';
import { TRANSCRIPT_PROTOCOLS } from '../types/transcript.ts';
import type { FixtureTextResult } from './buildFixtureText.ts';
import { replayPaths } from './replayPaths.ts';
import { createSanitizer, findSanitizerLeaks } from './sanitizer.ts';
import { parseTranscript, serializeTranscript } from './transcript.ts';

/**
 * Build the fixture text for one ACP capture recorded in `cwd`.
 *
 * @public
 */
export function buildAcpFixtureText(
  capture: string,
  header: TranscriptHeader,
  cwd: string,
): FixtureTextResult {
  const protocolHeader = { ...header, protocol: TRANSCRIPT_PROTOCOLS.acp };
  const parsed = parseTranscript(
    `${JSON.stringify(protocolHeader)}\n${capture}`,
  );
  if (!parsed.ok) {
    return { error: `capture unreadable: ${parsed.error}`, ok: false };
  }
  if (parsed.transcript.protocol !== TRANSCRIPT_PROTOCOLS.acp) {
    return { error: 'capture is not an acp transcript', ok: false };
  }

  const paths = replayPaths(cwd);
  const sanitizer = createSanitizer({ paths, redactKeys: [] });
  const text = serializeTranscript({
    ...parsed.transcript,
    header: {
      ...parsed.transcript.header,
      cliVersion: sanitizer.sanitizeText(parsed.transcript.header.cliVersion),
    },
  });

  const leaks = findSanitizerLeaks(text, {
    forbidden: paths.map((entry) => entry.path),
  });
  if (leaks.length > 0) {
    return { error: `sanitizer missed: ${leaks.join('; ')}`, ok: false };
  }

  return { ok: true, text };
}
