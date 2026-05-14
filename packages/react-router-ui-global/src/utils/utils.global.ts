// import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
// import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
// import { HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
// import { LockIcon } from '@phosphor-icons/react/dist/ssr/Lock';
// import { ADMIN_PATHS, dataNavigation } from '~/global/data/data.navigation';

import { LinkProps } from 'react-router';

/** Format MB values to 2 decimal places for display in stat cards. */
export const formatMb = (value: number): number => {
  return Number(value.toFixed(2));
};

/** Format CPU ms (cumulative) for display; show integer when possible. */
export const formatCpuMs = (value: number): number => {
  return Number(value.toFixed(0));
};

/**
 * @description Normalize path for comparison (strip trailing slash
 * so /mail and /mail/ match).
 */
export function normalizePath(p: string): string {
  const s = p.replace(/\/$/, '') || '/';
  return s === '' ? '/' : s;
}

export function getPath(to: LinkProps['to']): string {
  return typeof to === 'string' ? to : (to.pathname ?? '/');
}

export function getPathFromTo(to: LinkProps['to']): string {
  return typeof to === 'string' ? to : (to.pathname ?? '/');
}
