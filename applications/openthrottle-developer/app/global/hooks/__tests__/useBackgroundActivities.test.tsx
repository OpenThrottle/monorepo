import type { GlobalBackgroundActivity } from '@openthrottle/react-router-ui-global';
import { act, render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  BACKGROUND_ACTIVITIES_POLL_INTERVAL_MS,
  BACKGROUND_ACTIVITIES_RESOURCE_PATH,
} from '~/global/config/background-activities';

import { useBackgroundActivities } from '../useBackgroundActivities';

const ACTIVITY: GlobalBackgroundActivity = {
  done: 40,
  etaSeconds: 60,
  id: 'embeddings_backfill:code',
  label: 'Embedding code chunks',
  startedAt: '2026-11-15T18:00:00.000Z',
  status: 'running',
  total: 100,
};

/**
 * Renders a probe that prints the hook's activity ids, beside a stub of the
 * resource route whose loader answers with each `responses` entry in turn.
 */
const renderProbe = (
  initial: readonly GlobalBackgroundActivity[],
  responses: readonly (readonly GlobalBackgroundActivity[])[],
) => {
  const remaining = [...responses];
  const resourceLoader = vi.fn(() => {
    return { activities: remaining.shift() ?? [] };
  });
  const Probe = () => {
    const { activities } = useBackgroundActivities({ initial });

    return (
      <output data-testid="ids">
        {activities.map((activity) => activity.id).join(',')}
      </output>
    );
  };
  const Stub = createRoutesStub([
    { Component: Probe, path: '/' },
    { loader: resourceLoader, path: BACKGROUND_ACTIVITIES_RESOURCE_PATH },
  ]);
  const component = render(<Stub initialEntries={['/']} />);

  return { component, resourceLoader };
};

const tick = async (): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(BACKGROUND_ACTIVITIES_POLL_INTERVAL_MS);
  });
};

const setVisibility = (state: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
};

describe('useBackgroundActivities', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibility('visible');
  });

  describe('when the server is idle', () => {
    test('never polls', async () => {
      const { resourceLoader } = renderProbe([], []);

      await tick();
      await tick();

      expect(resourceLoader).not.toHaveBeenCalled();
    });
  });

  describe('while an activity runs', () => {
    test('serves the seed, then each poll result', async () => {
      const next = { ...ACTIVITY, done: 50, id: 'embeddings_backfill:plan' };
      const { component, resourceLoader } = renderProbe([ACTIVITY], [[next]]);

      expect(component.getByTestId('ids')).toHaveTextContent(ACTIVITY.id);

      await tick();

      await waitFor(() => {
        expect(component.getByTestId('ids')).toHaveTextContent(next.id);
      });
      expect(resourceLoader).toHaveBeenCalledOnce();
    });

    test('stops polling once the list empties', async () => {
      const { component, resourceLoader } = renderProbe([ACTIVITY], [[]]);

      await tick();

      await waitFor(() => {
        expect(component.getByTestId('ids')).toHaveTextContent('');
      });

      await tick();
      await tick();

      expect(resourceLoader).toHaveBeenCalledOnce();
    });
  });

  describe('while the tab is hidden', () => {
    test('skips the poll', async () => {
      const { resourceLoader } = renderProbe([ACTIVITY], []);

      setVisibility('hidden');
      await tick();

      expect(resourceLoader).not.toHaveBeenCalled();
    });
  });
});
