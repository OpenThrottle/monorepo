import type { ProjectCardFragment } from '~/__generated__/graphql';

/**
 * @description Project shape with optional stats for UI mock-up. When the API adds planCount/lastActivityAt, switch data source; no type change needed.
 */
export interface ProjectWithStats extends ProjectCardFragment {
  readonly lastActivityAt?: string | null;
  readonly planCount?: number | null;
}
