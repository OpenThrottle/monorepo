import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SidebarMenuSkeleton } from '../SidebarMenuSkeleton';
import type { SidebarMenuSkeletonProps } from '../SidebarMenuSkeleton';

describe('SidebarMenuSkeleton Component', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.825);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should render skeleton text with deterministic width', () => {
    const props: SidebarMenuSkeletonProps = {};
    const Component = () => <SidebarMenuSkeleton {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { container } = render(<RoutesStub />);

    const skeletonText = container.querySelector(
      '[data-sidebar="menu-skeleton-text"]',
    );
    expect(skeletonText).toBeInTheDocument();
    expect(skeletonText).toHaveStyle({ '--skeleton-width': '83%' });
  });
});
