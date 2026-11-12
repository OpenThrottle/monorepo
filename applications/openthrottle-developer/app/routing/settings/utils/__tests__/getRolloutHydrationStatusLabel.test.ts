import { describe, expect, test } from 'vitest';

import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';

import { getRolloutHydrationStatusLabel } from '../getRolloutHydrationStatusLabel';

describe('getRolloutHydrationStatusLabel', () => {
  test('maps each hydration status to its copy', () => {
    expect(getRolloutHydrationStatusLabel('error')).toBe(
      ROLLOUT_COPY.sdkHydrationError,
    );
    expect(getRolloutHydrationStatusLabel('ready')).toBe(
      ROLLOUT_COPY.sdkHydrationReady,
    );
    expect(getRolloutHydrationStatusLabel('loading')).toBe(
      ROLLOUT_COPY.sdkHydrationLoading,
    );
  });

  test('falls back to the idle copy for any other status', () => {
    expect(getRolloutHydrationStatusLabel('idle')).toBe(
      ROLLOUT_COPY.sdkHydrationIdle,
    );
  });
});
