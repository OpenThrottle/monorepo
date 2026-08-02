import { redirect } from 'react-router';
import type { Route } from '@/app/routes/+types/schedule.calendar';

/**
 * @description Legacy `/schedule/calendar` → `/calendar` (month view is now the
 * calendar index).
 */
export const loader = async (_args: Route.LoaderArgs) => {
  return redirect('/calendar');
};
