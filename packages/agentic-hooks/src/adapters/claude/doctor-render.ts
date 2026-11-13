/**
 * Output half of the telemetry doctor. Everything printed passes through `scrubCheck`, so a path
 * under the home directory renders as `~/…` and no token, email or hostname can leak into output a
 * user may paste into an issue.
 */
import type { DoctorCheck } from './doctor-checks.ts';
import { summarizeChecks } from './doctor-checks.ts';

/** Shortest token worth scrubbing; anything shorter would mangle ordinary words. */
const MIN_SCRUBBED_TOKEN_LENGTH = 6;

/** Shortest hostname worth scrubbing, for the same reason. */
const MIN_SCRUBBED_HOSTNAME_LENGTH = 4;

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

const ID_COLUMN_WIDTH = 14;
const STATUS_COLUMN_WIDTH = 4;

/**
 * What must never appear in output.
 *
 * @public
 */
export interface Scrubber {
  readonly homeDirs: readonly string[];
  readonly hostname: string | null;
  readonly token: string | null;
}

/**
 * Remove secrets and identity from one string.
 *
 * @public
 */
export const scrubText = (text: string, scrubber: Scrubber): string => {
  let out = text;
  if (
    scrubber.token !== null &&
    scrubber.token.length >= MIN_SCRUBBED_TOKEN_LENGTH
  ) {
    out = out.split(scrubber.token).join('<token>');
  }
  const homes = [...scrubber.homeDirs]
    .filter((home) => home.length > 1)
    .sort((a, b) => b.length - a.length);
  for (const home of homes) {
    out = out.split(home).join('~');
  }
  out = out.replace(EMAIL_PATTERN, '<email>');
  const host = scrubber.hostname;
  if (
    host !== null &&
    host.length >= MIN_SCRUBBED_HOSTNAME_LENGTH &&
    host !== 'localhost'
  ) {
    out = out.split(host).join('<host>');
  }
  return out;
};

const scrubCheck = (check: DoctorCheck, scrubber: Scrubber): DoctorCheck => {
  return {
    detail: scrubText(check.detail, scrubber),
    fix: check.fix === null ? null : scrubText(check.fix, scrubber),
    id: check.id,
    status: check.status,
  };
};

/**
 * The `--json` document: `{ checks, summary }`, scrubbed.
 *
 * @public
 */
export const renderDoctorJson = (
  checks: readonly DoctorCheck[],
  scrubber: Scrubber,
): string => {
  const clean = checks.map((check) => scrubCheck(check, scrubber));
  return `${JSON.stringify({ checks: clean, summary: summarizeChecks(clean) }, null, 2)}\n`;
};

/**
 * The default aligned-lines output followed by a "Fixes" block, scrubbed.
 *
 * @public
 */
export const renderDoctorHuman = (
  checks: readonly DoctorCheck[],
  scrubber: Scrubber,
): string => {
  const clean = checks.map((check) => scrubCheck(check, scrubber));
  const lines = clean.map((check) => {
    const status = check.status.padEnd(STATUS_COLUMN_WIDTH);
    return `${status}  ${check.id.padEnd(ID_COLUMN_WIDTH)}${check.detail}`;
  });
  const withFix = clean.filter((check) => check.fix !== null);
  const fixes = withFix.flatMap((check): readonly string[] => {
    const body = (check.fix ?? '').split('\n').map((line) => `    ${line}`);
    return [`  ${check.id}`, ...body];
  });
  const summary = summarizeChecks(clean);
  const tally = `${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`;
  const tail = fixes.length === 0 ? [] : ['', 'Fixes', ...fixes];
  return `${[...lines, '', tally, ...tail].join('\n')}\n`;
};
