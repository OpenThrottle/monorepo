import { redirect } from 'react-router';
import type { Route } from '@/app/routes/+types/schedule.create';

/**
 * @description Legacy `/schedule/create` → `/calendar/create`.
 */
export const loader = async (_args: Route.LoaderArgs) => {
  return redirect('/calendar/create');
};
