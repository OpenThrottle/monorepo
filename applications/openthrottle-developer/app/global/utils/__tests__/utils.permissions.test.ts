import { describe, expect, test } from 'vitest';

import { PERMISSIONS } from '~/global/config/permissions';

import type { PermissionGatedNavigation } from '../utils.permissions';
import {
  filterNavigationByPermission,
  hasPermission,
} from '../utils.permissions';

const Icon = (): null => null;

const navigation: PermissionGatedNavigation = {
  Drafts: [
    {
      children: 'Blog',
      icon: Icon,
      requiredPermission: PERMISSIONS.BLOG_DRAFT,
      to: '/blog',
    },
  ],
  Workspace: [
    { children: 'Notes', icon: Icon, to: '/notes' },
    {
      children: 'Blog',
      icon: Icon,
      requiredPermission: PERMISSIONS.BLOG_DRAFT,
      to: '/blog',
    },
  ],
};

describe('hasPermission', () => {
  test('is true only when the permission is listed', () => {
    expect(hasPermission(['blog:draft'], PERMISSIONS.BLOG_DRAFT)).toBe(true);
    expect(hasPermission(['users:read'], PERMISSIONS.BLOG_DRAFT)).toBe(false);
    expect(hasPermission([], PERMISSIONS.BLOG_DRAFT)).toBe(false);
  });
});

describe('filterNavigationByPermission', () => {
  test('drops gated links and emptied sections without the permission', () => {
    const result = filterNavigationByPermission(navigation, ['users:read']);

    expect(Object.keys(result)).toEqual(['Workspace']);
    expect(result['Workspace']?.map((link) => link.to)).toEqual(['/notes']);
  });

  test('keeps gated links when the permission is held', () => {
    const result = filterNavigationByPermission(navigation, ['blog:draft']);

    expect(Object.keys(result)).toEqual(['Drafts', 'Workspace']);
    expect(result['Workspace']?.map((link) => link.to)).toEqual([
      '/notes',
      '/blog',
    ]);
  });
});
