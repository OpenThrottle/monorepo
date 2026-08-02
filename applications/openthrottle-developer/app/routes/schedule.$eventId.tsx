import { redirect } from 'react-router';
import type { Route } from '@/app/routes/+types/schedule.$eventId';

/**
 * @description Legacy `/schedule/:eventId` → `/calendar/:eventId`.
 */
export const loader = async (args: Route.LoaderArgs) => {
  const eventId = args.params.eventId ?? '';
  return redirect(`/calendar/${encodeURIComponent(eventId)}`);
};
