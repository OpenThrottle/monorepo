import {
  PROJECT_TAB_VALUES,
  type ProjectTabValue,
} from '~/routing/projects/data/tabs';

/** Narrow a raw string to a project-detail {@link ProjectTabValue}. */
export const isProjectTabValue = (value: string): value is ProjectTabValue =>
  PROJECT_TAB_VALUES.some((tab) => tab === value);
