import { redirect } from 'react-router';
import type { Route } from '@/app/routes/+types/schedule._index';

/**
 * @description Legacy `/schedule` → `/calendar/list` (table view moved off the
 * calendar index after the Schedule → Calendar rename).
 */
export const loader = async (_args: Route.LoaderArgs) => {
  return redirect('/calendar/list');
};
