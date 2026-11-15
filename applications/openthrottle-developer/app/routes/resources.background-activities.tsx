import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalBackgroundActivity } from '@openthrottle/react-router-ui-global';

import type { Route } from '@/app/routes/+types/resources.background-activities';
import { GetBackgroundActivitiesDocument } from '~/__generated__/graphql';

/**
 * Resource route (loader-only) behind the sidebar footer's progress bar —
 * `/resources/background-activities`. The root loader seeds the list; while it
 * is non-empty, {@link useBackgroundActivities} re-loads it here through a
 * fetcher, which runs only this loader, so a poll never re-runs the root's.
 * A failure reads as idle: the bar hides and polling stops, and the next
 * navigation re-seeds it from the root loader.
 */
export const loader = async (
  args: Route.LoaderArgs,
): Promise<{ readonly activities: readonly GlobalBackgroundActivity[] }> => {
  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      GetBackgroundActivitiesDocument,
    );

    return { activities: data.backgroundActivities };
  } catch {
    return { activities: [] };
  }
};
