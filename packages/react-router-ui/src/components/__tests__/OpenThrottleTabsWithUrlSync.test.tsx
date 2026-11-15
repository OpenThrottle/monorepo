import {
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { OpenThrottleTabsWithUrlSyncProps } from '../OpenThrottleTabsWithUrlSync';
import { OpenThrottleTabsWithUrlSync } from '../OpenThrottleTabsWithUrlSync';

const PARAM = 'tab';
const SEARCH_PARAMS_ID = 'search-params-string';

function TabsFixture(
  props: Omit<OpenThrottleTabsWithUrlSyncProps, 'children' | 'urlSync'> = {},
) {
  return (
    <OpenThrottleTabsWithUrlSync
      urlSync={{ defaultValue: 'one', param: PARAM }}
      {...props}
    >
      <TabsList>
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two">Two</TabsTrigger>
      </TabsList>
      <TabsContent value="one">Panel one</TabsContent>
      <TabsContent value="two">Panel two</TabsContent>
    </OpenThrottleTabsWithUrlSync>
  );
}

// eslint-disable-next-line react/no-multi-comp -- test-local mock component
function SearchParamsReader() {
  const [searchParams] = useSearchParams();
  return <span data-testid={SEARCH_PARAMS_ID}>{searchParams.toString()}</span>;
}

function renderTabs(
  options: {
    readonly initialEntry?: string;
    readonly tabsProps?: Omit<
      OpenThrottleTabsWithUrlSyncProps,
      'children' | 'urlSync'
    >;
  } = {},
) {
  const { initialEntry = '/', tabsProps = {} } = options;
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => {
    return (
      <>
        <SearchParamsReader />
        <TabsFixture {...tabsProps} />
      </>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub initialEntries={[initialEntry]} />);
}

describe('OpenThrottleTabsWithUrlSync Component', () => {
  test('shows the default tab when the param is absent', () => {
    const component = renderTabs();

    expect(component.getByRole('tab', { name: 'One' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(component.getByText('Panel one')).toBeVisible();
    expect(component.getByTestId(SEARCH_PARAMS_ID)).toHaveTextContent('');
  });

  test('reads the active tab from the URL', () => {
    const component = renderTabs({ initialEntry: `/?${PARAM}=two` });

    expect(component.getByRole('tab', { name: 'Two' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(component.getByText('Panel two')).toBeVisible();
  });

  test('updates the search param when selecting a non-default tab', async () => {
    const user = userEvent.setup();
    const component = renderTabs();

    await user.click(component.getByRole('tab', { name: 'Two' }));

    expect(component.getByRole('tab', { name: 'Two' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(component.getByTestId(SEARCH_PARAMS_ID).textContent).toContain(
      `${PARAM}=two`,
    );
  });

  test('merges w-full with a custom className on the root', () => {
    const RoutesStub = createRoutesStub([
      {
        // eslint-disable-next-line react/no-multi-comp -- test-local mock component
        Component: () => <TabsFixture className="custom-root" />,
        path: '/',
      },
    ]);

    const view = render(<RoutesStub initialEntries={['/']} />);
    const root = view.container.querySelector('[data-slot="tabs"]');

    expect(root).toHaveClass('w-full', 'custom-root');
  });

  describe('when value and onValueChange are both provided (fully controlled)', () => {
    test('delegates to onValueChange and does not write urlSync params', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();

      const component = renderTabs({
        tabsProps: { onValueChange, value: 'one' },
      });

      await user.click(component.getByRole('tab', { name: 'Two' }));

      expect(onValueChange).toHaveBeenCalledWith('two');
      expect(component.getByTestId(SEARCH_PARAMS_ID)).toHaveTextContent('');
      expect(component.getByRole('tab', { name: 'One' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });
});
