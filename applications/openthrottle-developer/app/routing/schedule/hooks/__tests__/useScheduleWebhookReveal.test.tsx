import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { useScheduleWebhookReveal } from '../useScheduleWebhookReveal';

const credentials = { secret: 's3cret', webhookPath: '/webhooks/agent-jobs/t' };

describe('useScheduleWebhookReveal', () => {
  test('has nothing to reveal until an action returns credentials', () => {
    const { result } = renderHook(() =>
      useScheduleWebhookReveal({ actionData: undefined }),
    );

    expect(result.current.credentials).toBeUndefined();
  });

  test('keeps the credentials until dismissed', () => {
    const { rerender, result } = renderHook(
      (actionData: unknown) => useScheduleWebhookReveal({ actionData }),
      { initialProps: { ok: true, webhookCredentials: credentials } },
    );

    expect(result.current.credentials).toEqual(credentials);

    // A later navigation clears actionData; the reveal must survive it.
    rerender(undefined);
    expect(result.current.credentials).toEqual(credentials);

    act(() => result.current.dismiss());
    expect(result.current.credentials).toBeUndefined();
  });
});
