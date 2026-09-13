import { describe, expect, test } from 'vitest';

import type { RepositoryCheckoutFieldsFragment } from '~/__generated__/graphql';
import { REPOSITORY_HOOK_TELEMETRY_COPY } from '~/routing/settings/repositories/data/data.copy';
import { deriveHookTelemetry } from '~/routing/settings/repositories/utils/hook-telemetry';

type Inspection = NonNullable<RepositoryCheckoutFieldsFragment['inspection']>;
type HookTelemetry = NonNullable<Inspection['hookTelemetry']>;

const inspectionWith = (
  hookTelemetry: HookTelemetry | undefined,
): Inspection => ({
  agentConfig: {
    agentsMd: false,
    claudeMd: false,
    cursorRules: false,
    mcpJson: false,
    skillsDir: false,
  },
  git: {
    currentBranch: 'main',
    defaultBranch: 'main',
    dirty: false,
    isRepo: true,
    linkedWorktrees: [],
    normalizedRemoteUrl: null,
  },
  hookTelemetry,
  scannedAt: '2026-09-13T00:00:00.000Z',
  stack: {
    languages: [],
    nxWorkspace: false,
    packageManager: null,
    pnpmWorkspace: false,
    turbo: false,
  },
  warnings: [],
});

const telemetry = (overrides: Partial<HookTelemetry>): HookTelemetry => ({
  authTokenConfigured: false,
  endpointConfigured: false,
  endpointSource: 'none',
  producers: [],
  reason: null,
  status: 'recording',
  telemetryDir: '/Users/dev/.openthrottle/skill-usage',
  ...overrides,
});

describe('deriveHookTelemetry', () => {
  test('returns null when the checkout has never been inspected', () => {
    expect(deriveHookTelemetry(null)).toBeNull();
  });

  test('returns null for a snapshot written before telemetry readiness existed', () => {
    expect(deriveHookTelemetry(inspectionWith(undefined))).toBeNull();
  });

  test('recording needs no remediation and names the layer that answered', () => {
    const derived = deriveHookTelemetry(
      inspectionWith(
        telemetry({
          endpointConfigured: true,
          endpointSource: 'user_env',
          producers: ['claude'],
          status: 'recording',
        }),
      ),
    );

    expect(derived?.label).toBe(REPOSITORY_HOOK_TELEMETRY_COPY.recordingLabel);
    expect(derived?.remediation).toBeNull();
    expect(derived?.command).toBeNull();
    expect(derived?.endpointSource).toBe(
      REPOSITORY_HOOK_TELEMETRY_COPY.endpointSourceLabels.user_env,
    );
  });

  test('buffering hands over the exact env line to add', () => {
    const derived = deriveHookTelemetry(
      inspectionWith(
        telemetry({
          producers: ['cursor'],
          reason: 'no_endpoint',
          status: 'buffering',
        }),
      ),
    );

    expect(derived?.label).toBe(REPOSITORY_HOOK_TELEMETRY_COPY.bufferingLabel);
    expect(derived?.command).toContain('OPENTHROTTLE_GRAPHQL_URL=');
    expect(derived?.remediation).toContain('~/.openthrottle/.env');
    // No endpoint resolved, so there is no layer to name.
    expect(derived?.endpointSource).toBeNull();
  });

  test('a missing auth token asks for the token, not for the URL again', () => {
    const derived = deriveHookTelemetry(
      inspectionWith(
        telemetry({
          endpointConfigured: true,
          endpointSource: 'user_env',
          producers: ['cursor'],
          reason: 'no_auth_token',
          status: 'buffering',
        }),
      ),
    );

    expect(derived?.command).toContain('OPENTHROTTLE_MCP_AUTH_TOKEN=');
    expect(derived?.remediation).toContain('no auth token');
    expect(derived?.summary).toContain('Unauthorized');
  });

  test('offline is its own state, not a misconfiguration', () => {
    const derived = deriveHookTelemetry(
      inspectionWith(
        telemetry({
          endpointConfigured: true,
          endpointSource: 'process_env',
          producers: ['claude'],
          reason: 'offline_flag',
          status: 'offline',
        }),
      ),
    );

    expect(derived?.label).toBe(REPOSITORY_HOOK_TELEMETRY_COPY.offlineLabel);
    expect(derived?.tone).toBe('secondary');
    expect(derived?.command).toBe(
      REPOSITORY_HOOK_TELEMETRY_COPY.offlineSnippet,
    );
  });

  test('not_wired reads as unwired rather than broken', () => {
    const derived = deriveHookTelemetry(
      inspectionWith(
        telemetry({
          endpointConfigured: true,
          endpointSource: 'repo_env',
          reason: 'no_producer',
          status: 'not_wired',
        }),
      ),
    );

    expect(derived?.label).toBe(REPOSITORY_HOOK_TELEMETRY_COPY.notWiredLabel);
    // outline, never destructive: an OT-orchestrated run still records here.
    expect(derived?.tone).toBe('outline');
    expect(derived?.summary).toContain('OpenThrottle-orchestrated runs');
    expect(derived?.producers).toEqual([]);
  });

  test('an unknown endpoint source falls through to itself rather than blanking', () => {
    const derived = deriveHookTelemetry(
      inspectionWith(
        telemetry({
          endpointConfigured: true,
          endpointSource: 'some_future_layer',
          producers: ['claude'],
          status: 'recording',
        }),
      ),
    );

    expect(derived?.endpointSource).toBe('some_future_layer');
  });
});
