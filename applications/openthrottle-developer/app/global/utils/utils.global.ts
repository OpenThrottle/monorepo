import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { LockIcon } from '@phosphor-icons/react/dist/ssr/Lock';
import { ADMIN_PATHS, dataNavigation } from '~/global/data/data.navigation';

/**
 * @description Normalize path for comparison (strip trailing slash
 * so /mail and /mail/ match).
 */
export function normalizePath(p: string): string {
  const s = p.replace(/\/$/, '') || '/';
  return s === '' ? '/' : s;
}

export function getNavIcon(
  path: string,
): React.ComponentType<{ className?: string }> | undefined {
  const norm = normalizePath(path);

  if (norm === ADMIN_PATHS.dashboard) return PaperPlaneTiltIcon;
  if (norm === ADMIN_PATHS.home) return HouseIcon;
  if (norm === ADMIN_PATHS.permissions) return LockIcon;
  if (norm === ADMIN_PATHS.roles) return LockIcon;
  if (norm === ADMIN_PATHS.users) return UsersIcon;

  return undefined;
}

type GlobalLinkProps = (typeof dataNavigation)[number];

export function getPath(to: GlobalLinkProps['to']): string {
  return typeof to === 'string' ? to : (to.pathname ?? '/');
}

export function getPathFromTo(to: GlobalLinkProps['to']): string {
  return typeof to === 'string' ? to : (to.pathname ?? '/');
}
