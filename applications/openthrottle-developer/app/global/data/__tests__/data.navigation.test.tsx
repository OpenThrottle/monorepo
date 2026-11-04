import { SidebarProvider } from '@openthrottle/react-router-shadcn';
import { GlobalSidebarContent } from '@openthrottle/react-router-ui-global';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { filterNavigationByPermission } from '~/global/utils/utils.permissions';

import { dataNavigationV2 } from '../data.navigation';

// FEATURE_BETA_PREVIEW resolves from process.env at module load, so the real
// export is a frozen `false` under test. Mock it as a getter over a hoisted
// box so a single file can exercise both sides of the gate at render time.
const betaPreview = vi.hoisted(() => ({ enabled: true }));

vi.mock('@openthrottle/react-router-utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-utils')>();

  return {
    ...actual,
    get FEATURE_BETA_PREVIEW() {
      return betaPreview.enabled;
    },
  };
});

const renderSidebar = (
  permissions: readonly string[],
): ReturnType<typeof render> => {
  const Stub = createRoutesStub([
    {
      Component: () => (
        <SidebarProvider>
          <GlobalSidebarContent
            data={filterNavigationByPermission(dataNavigationV2, permissions)}
          />
        </SidebarProvider>
      ),
      path: '/',
    },
    {
      // eslint-disable-next-line react/no-multi-comp
      Component: () => <p>blog page</p>,
      path: '/blog',
    },
  ]);

  return render(<Stub />);
};

describe('dataNavigationV2 Blog entry', () => {
  beforeEach(() => {
    betaPreview.enabled = true;
  });

  test('is hidden when beta preview is disabled, even with blog:draft', () => {
    betaPreview.enabled = false;
    const component = renderSidebar(['blog:draft']);

    expect(component.queryByRole('link', { name: 'Blog' })).toBeNull();
    expect(component.getByRole('link', { name: 'Notes' })).toBeDefined();
  });

  test('is hidden without blog:draft', () => {
    const component = renderSidebar(['users:read']);

    expect(component.queryByRole('link', { name: 'Blog' })).toBeNull();
    expect(component.getByRole('link', { name: 'Notes' })).toBeDefined();
  });

  test('is shown with blog:draft and navigates to /blog', async () => {
    const user = userEvent.setup();
    const component = renderSidebar(['blog:draft']);

    await user.click(component.getByRole('link', { name: 'Blog' }));

    expect(await component.findByText('blog page')).toBeDefined();
  });
});
