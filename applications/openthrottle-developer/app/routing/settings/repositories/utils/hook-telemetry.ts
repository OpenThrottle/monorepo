import type { RepositoryCheckoutFieldsFragment } from '~/__generated__/graphql';
import { REPOSITORY_HOOK_TELEMETRY_COPY } from '~/routing/settings/repositories/data/data.copy';

/** The inspection payload carried by a repository checkout, or null. */
type CheckoutInspection = RepositoryCheckoutFieldsFragment['inspection'];

/**
 * Badge tone per status. `not_wired` is `outline` rather than `destructive`:
 * nothing is broken there, only unwired for runs the user starts himself.
 */
const TONE_BY_STATUS = {
  buffering: 'destructive',
  not_wired: 'outline',
  offline: 'secondary',
  recording: 'default',
} as const;

export interface HookTelemetryPresentation {
  /** Shell/env line the user can copy, or null when nothing to do. */
  readonly command: string | null;
  /** Which location supplied the endpoint, in words. */
  readonly endpointSource: string | null;
  readonly label: string;
  /** Hook configs found in the checkout; empty when none. */
  readonly producers: readonly string[];
  /** One actionable sentence, or null when the checkout is recording. */
  readonly remediation: string | null;
  readonly summary: string;
  readonly tone: (typeof TONE_BY_STATUS)[keyof typeof TONE_BY_STATUS];
}

/**
 * Widened to a string index so an unknown future source code falls through to
 * itself rather than needing a cast to look it up.
 */
const ENDPOINT_SOURCE_LABELS: Record<string, string> =
  REPOSITORY_HOOK_TELEMETRY_COPY.endpointSourceLabels;

const readEndpointSource = (source: string): string =>
  ENDPOINT_SOURCE_LABELS[source] ?? source;

/**
 * @description Turn a checkout's `hookTelemetry` into everything the badge and
 * the detail block render. Presentation-free input, copy-only output: the
 * server owns the status and the reason code, and this maps them to words so no
 * component invents its own explanation.
 *
 * Null-safe by design — inspection is a refreshable cache, so a snapshot taken
 * before telemetry readiness existed has no answer rather than a wrong one, and
 * that case gets its own state instead of being reported as a failure.
 */
export const deriveHookTelemetry = (
  inspection: CheckoutInspection,
): HookTelemetryPresentation | null => {
  const telemetry = inspection?.hookTelemetry;
  if (telemetry == null) {
    return null;
  }

  const producers = telemetry.producers;
  const endpointSource = telemetry.endpointConfigured
    ? readEndpointSource(telemetry.endpointSource)
    : null;

  if (telemetry.status === 'recording') {
    return {
      command: null,
      endpointSource,
      label: REPOSITORY_HOOK_TELEMETRY_COPY.recordingLabel,
      producers,
      remediation: null,
      summary: REPOSITORY_HOOK_TELEMETRY_COPY.recordingSummary,
      tone: TONE_BY_STATUS.recording,
    };
  }

  if (telemetry.status === 'offline') {
    return {
      command: REPOSITORY_HOOK_TELEMETRY_COPY.offlineSnippet,
      endpointSource,
      label: REPOSITORY_HOOK_TELEMETRY_COPY.offlineLabel,
      producers,
      remediation: REPOSITORY_HOOK_TELEMETRY_COPY.offlineRemediation,
      summary: REPOSITORY_HOOK_TELEMETRY_COPY.offlineSummary,
      tone: TONE_BY_STATUS.offline,
    };
  }

  if (telemetry.status === 'not_wired') {
    return {
      command: REPOSITORY_HOOK_TELEMETRY_COPY.wireSnippet,
      endpointSource,
      label: REPOSITORY_HOOK_TELEMETRY_COPY.notWiredLabel,
      producers,
      remediation: REPOSITORY_HOOK_TELEMETRY_COPY.notWiredRemediation,
      summary: REPOSITORY_HOOK_TELEMETRY_COPY.notWiredSummary,
      tone: TONE_BY_STATUS.not_wired,
    };
  }

  // Buffering has two causes and they need different fixes: no endpoint at
  // all, or an endpoint with no token to authenticate against it.
  const missingToken = telemetry.reason === 'no_auth_token';

  return {
    command: missingToken
      ? REPOSITORY_HOOK_TELEMETRY_COPY.missingTokenSnippet
      : REPOSITORY_HOOK_TELEMETRY_COPY.envSnippet,
    endpointSource,
    label: missingToken
      ? REPOSITORY_HOOK_TELEMETRY_COPY.missingTokenLabel
      : REPOSITORY_HOOK_TELEMETRY_COPY.bufferingLabel,
    producers,
    remediation: missingToken
      ? REPOSITORY_HOOK_TELEMETRY_COPY.missingTokenRemediation
      : REPOSITORY_HOOK_TELEMETRY_COPY.bufferingRemediation,
    summary: missingToken
      ? REPOSITORY_HOOK_TELEMETRY_COPY.missingTokenSummary
      : REPOSITORY_HOOK_TELEMETRY_COPY.bufferingSummary,
    tone: TONE_BY_STATUS.buffering,
  };
};
