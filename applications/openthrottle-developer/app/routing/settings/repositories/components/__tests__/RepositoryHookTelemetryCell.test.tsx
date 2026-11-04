import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { RepositoryCheckoutFieldsFragment } from '~/__generated__/graphql';
import { REPOSITORY_HOOK_TELEMETRY_COPY } from '~/routing/settings/repositories/data/data.copy';
import {
  mockCheckout,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';
import { buildRepositoryRows } from '~/routing/settings/repositories/utils/rows';

import { RepositoryHookTelemetryCell } from '../RepositoryHookTelemetryCell';

type Inspection = NonNullable<RepositoryCheckoutFieldsFragment['inspection']>;
type HookTelemetry = NonNullable<Inspection['hookTelemetry']>;

/**
 * A row whose checkout carries `hookTelemetry`. The shared mock factory
 * predates the field, so the telemetry is layered onto the inspection it
 * builds rather than duplicating the whole snapshot here.
 */
const rowWith = (
  hookTelemetry: HookTelemetry | undefined,
): RepositoryCheckoutRow => {
  const checkout = mockCheckout({ branch: 'main', id: 'primary-1' });
  const inspection = checkout.inspection;
  if (inspection == null) {
    throw new Error('expected the mock checkout to carry an inspection');
  }

  const [row] = buildRepositoryRows([
    mockRepository({
      checkouts: [
        { ...checkout, inspection: { ...inspection, hookTelemetry } },
      ],
      id: 'repo-1',
      name: 'monorepo',
    }),
  ]);
  if (row === undefined) {
    throw new Error('expected a repository row');
  }
  return row;
};

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

describe('RepositoryHookTelemetryCell Component', () => {
  let component: RenderResult;

  const setup = (hookTelemetry: HookTelemetry | undefined): void => {
    component = render(
      <RepositoryHookTelemetryCell row={rowWith(hookTelemetry)} />,
    );
  };

  test('badges a recording checkout and explains it on hover', () => {
    setup(
      telemetry({
        authTokenConfigured: true,
        endpointConfigured: true,
        endpointSource: 'user_env',
        producers: ['claude'],
        status: 'recording',
      }),
    );

    const badge = component.getByText(
      REPOSITORY_HOOK_TELEMETRY_COPY.recordingLabel,
    );
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'title',
      REPOSITORY_HOOK_TELEMETRY_COPY.recordingSummary,
    );
  });

  test('badges a buffering checkout — the state that hid the original bug', () => {
    setup(
      telemetry({
        producers: ['cursor'],
        reason: 'no_endpoint',
        status: 'buffering',
      }),
    );

    expect(
      component.getByText(REPOSITORY_HOOK_TELEMETRY_COPY.bufferingLabel),
    ).toBeInTheDocument();
  });

  test('badges an offline checkout', () => {
    setup(
      telemetry({
        endpointConfigured: true,
        endpointSource: 'process_env',
        producers: ['claude'],
        reason: 'offline_flag',
        status: 'offline',
      }),
    );

    expect(
      component.getByText(REPOSITORY_HOOK_TELEMETRY_COPY.offlineLabel),
    ).toBeInTheDocument();
  });

  test('badges an unwired checkout without claiming it cannot record', () => {
    setup(telemetry({ reason: 'no_producer', status: 'not_wired' }));

    const badge = component.getByText(
      REPOSITORY_HOOK_TELEMETRY_COPY.notWiredLabel,
    );
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute('title')).toContain(
      'OpenThrottle-orchestrated runs still record',
    );
  });

  test('says the answer is unknown on a snapshot that predates the field', () => {
    setup(undefined);

    const marker = component.getByText(
      REPOSITORY_HOOK_TELEMETRY_COPY.notInspectedLabel,
    );
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute(
      'title',
      REPOSITORY_HOOK_TELEMETRY_COPY.notInspectedSummary,
    );
  });
});
