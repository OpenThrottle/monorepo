import { GlobalLayoutProps } from '@openthrottle/react-router-ui-global';
import {
  GaugeIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  UserIcon,
} from 'lucide-react';

/** Canonical paths for admin areas. Use these for Link `to` and comparisons. */
export const ADMIN_PATHS = {
  dashboard: `/dashboard`,
  home: `/`,
  permissions: `/permissions`,
  roles: `/roles`,
  users: `/users`,
} as const;

export const dataNavigation: GlobalLayoutProps['data'] = {
  Workspace: [
    {
      children: 'Dashboard',
      icon: GaugeIcon,
      to: ADMIN_PATHS.dashboard,
    },
    {
      children: 'Permissions',
      icon: KeyRoundIcon,
      to: ADMIN_PATHS.permissions,
    },
    {
      children: 'Roles',
      icon: ShieldCheckIcon,
      to: ADMIN_PATHS.roles,
    },
    {
      children: 'Users',
      icon: UserIcon,
      to: ADMIN_PATHS.users,
    },
  ],
};
