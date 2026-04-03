import { PLAN_STATUS_FILTER_OPTIONS } from '~/routing/plans/config/status-options';

export function getPlanStatusLabel(status: string | null | undefined): string {
  if (status == null) return 'Unknown';

  const option = PLAN_STATUS_FILTER_OPTIONS.find(
    (option) => option.value === status,
  );

  return option?.label ?? status;
}
