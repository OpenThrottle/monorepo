import type { GlobalBackgroundActivity } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { useFetcher } from 'react-router';

import {
  BACKGROUND_ACTIVITIES_POLL_INTERVAL_MS,
  BACKGROUND_ACTIVITIES_RESOURCE_PATH,
} from '~/global/config/background-activities';

export interface UseBackgroundActivitiesOptions {
  /** The root loader's list: the seed, and a fresh value after every navigation. */
  readonly initial: readonly GlobalBackgroundActivity[];
}

export interface UseBackgroundActivitiesResult {
  readonly activities: readonly GlobalBackgroundActivity[];
}

/**
 * @description Long-running server work for the sidebar footer (OT plan
 * 5767e798). Seeded by the root loader, then re-loaded every
 * {@link BACKGROUND_ACTIVITIES_POLL_INTERVAL_MS} through a fetcher on
 * {@link BACKGROUND_ACTIVITIES_RESOURCE_PATH} — but only while the list is
 * non-empty and the tab is visible, so an idle app makes no requests. A
 * fetcher load runs that resource route's loader alone, never the root's.
 * Whichever of the root loader and the fetcher answered last wins.
 */
export const useBackgroundActivities = (
  options: UseBackgroundActivitiesOptions,
): UseBackgroundActivitiesResult => {
  const { initial } = options;

  // Hooks
  const fetcher = useFetcher<{
    readonly activities: readonly GlobalBackgroundActivity[];
  }>();
  const [activities, setActivities] = React.useState(initial);

  // Setup
  // `load` identity changes every render, so the polling effect keys on
  // whether anything is running and reads the latest loader through a ref.
  const loadRef = React.useRef(fetcher.load);
  const isActive = activities.length > 0;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    loadRef.current = fetcher.load;
  }, [fetcher.load]);

  React.useEffect(() => {
    setActivities(initial);
  }, [initial]);

  React.useEffect(() => {
    if (fetcher.data !== undefined) {
      setActivities(fetcher.data.activities);
    }
  }, [fetcher.data]);

  React.useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadRef.current(BACKGROUND_ACTIVITIES_RESOURCE_PATH);
      }
    }, BACKGROUND_ACTIVITIES_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [isActive]);

  // 🔌 Short Circuit

  return { activities };
};
