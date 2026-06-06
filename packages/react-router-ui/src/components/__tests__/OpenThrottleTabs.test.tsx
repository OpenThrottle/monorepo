import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { OpenThrottleTabs } from '../OpenThrottleTabs';
import type { OpenThrottleTabsProps } from '../OpenThrottleTabs';

const PARAM = 'tab';
const SEARCH_PARAMS_ID = 'search-params-string';

function UrlSyncedTabsFixture(
  props: Omit<OpenThrottleTabsProps, 'children' | 'urlSync'> = {},
) {
  return (
    <OpenThrottleTabs
      urlSync={{ defaultValue: 'one', param: PARAM }}
      {...props}
    >
      <TabsList>
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two">Two</TabsTrigger>
      </TabsList>
      <TabsContent value="one">Panel one</TabsContent>
      <TabsContent value="two">Panel two</TabsContent>
    </OpenThrottleTabs>
  );
}

function SearchParamsReader() {
  const [searchParams] = useSearchParams();
  return <span data-testid={SEARCH_PARAMS_ID}>{searchParams.toString()}</span>;
}

function renderUrlSyncedTabs(
  options: {
    readonly initialEntry?: string;
    readonly tabsProps?: Omit<OpenThrottleTabsProps, 'children' | 'urlSync'>;
  } = {},
) {
  const { initialEntry = '/', tabsProps = {} } = options;
  const Component = () => (
    <>
      <SearchParamsReader />
      <UrlSyncedTabsFixture {...tabsProps} />
    </>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub initialEntries={[initialEntry]} />);
}

describe('OpenThrottleTabs Component', () => {
  describe('when urlSync is not set', () => {
    test('renders uncontrolled tabs with default panel visible', () => {
      const RoutesStub = createRoutesStub([
        {
          Component: () => (
            <OpenThrottleTabs defaultValue="one">
              <TabsList>
                <TabsTrigger value="one">One</TabsTrigger>
                <TabsTrigger value="two">Two</TabsTrigger>
              </TabsList>
              <TabsContent value="one">Panel one</TabsContent>
              <TabsContent value="two">Panel two</TabsContent>
            </OpenThrottleTabs>
          ),
          path: '/',
        },
      ]);

      render(<RoutesStub />);

      expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByText('Panel one')).toBeVisible();
    });

    test('merges w-full with custom className on the root', () => {
      const RoutesStub = createRoutesStub([
        {
          Component: () => (
            <OpenThrottleTabs className="custom-root" defaultValue="one">
              <TabsList>
                <TabsTrigger value="one">One</TabsTrigger>
              </TabsList>
              <TabsContent value="one">Panel</TabsContent>
            </OpenThrottleTabs>
          ),
          path: '/',
        },
      ]);

      const view = render(<RoutesStub />);
      const root = view.container.querySelector('[data-slot="tabs"]');

      expect(root).toHaveClass('w-full', 'custom-root');
    });
  });

  describe('when urlSync is set', () => {
    test('shows the default tab when the param is absent', () => {
      renderUrlSyncedTabs();

      expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByText('Panel one')).toBeVisible();
      expect(screen.getByTestId(SEARCH_PARAMS_ID)).toHaveTextContent('');
    });

    test('reads the active tab from the URL', () => {
      renderUrlSyncedTabs({ initialEntry: `/?${PARAM}=two` });

      expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByText('Panel two')).toBeVisible();
    });

    test('updates the search param when selecting a non-default tab', async () => {
      const user = userEvent.setup();
      renderUrlSyncedTabs();

      await user.click(screen.getByRole('tab', { name: 'Two' }));

      expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByTestId(SEARCH_PARAMS_ID).textContent).toContain(
        `${PARAM}=two`,
      );
    });

    test('removes the search param when selecting the default tab', async () => {
      const user = userEvent.setup();
      renderUrlSyncedTabs({ initialEntry: `/?${PARAM}=two` });

      await user.click(screen.getByRole('tab', { name: 'One' }));

      expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByTestId(SEARCH_PARAMS_ID)).toHaveTextContent('');
    });
  });

  describe('when value and onValueChange are both provided', () => {
    test('does not write urlSync params on tab change', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();

      renderUrlSyncedTabs({
        tabsProps: {
          onValueChange,
          value: 'one',
        },
      });

      await user.click(screen.getByRole('tab', { name: 'Two' }));

      expect(onValueChange).toHaveBeenCalledWith('two');
      expect(screen.getByTestId(SEARCH_PARAMS_ID)).toHaveTextContent('');
      expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });
});
