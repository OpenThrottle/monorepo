import * as React from 'react';
import { act, render } from '@testing-library/react';
import type { CommanderGroup } from '@openthrottle/react-router-ui';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import {
  dataNavigationGuest,
  dataNavigationV2,
} from '~/global/data/data.navigation';
import type { NavigationRecord } from '~/global/utils/navigation-to-commander-groups';
import { useCommanderOptions } from '../useCommanderOptions';

function HookProbe(props: {
  readonly navigation: NavigationRecord;
  readonly value: { current: CommanderGroup[] | null };
}): null {
  props.value.current = useCommanderOptions(props.navigation);
  return null;
}

// eslint-disable-next-line react/no-multi-comp
function DashboardMarker(): React.ReactElement {
  return <div data-testid="on-dashboard" />;
}

const renderCommanderOptions = (
  navigation: NavigationRecord,
): {
  readonly component: ReturnType<typeof render>;
  readonly value: { current: CommanderGroup[] | null };
} => {
  const value: { current: CommanderGroup[] | null } = { current: null };
  const Stub = createRoutesStub([
    {
      // eslint-disable-next-line react/no-multi-comp
      Component: () => <HookProbe navigation={navigation} value={value} />,
      path: '/',
    },
    { Component: DashboardMarker, path: '/dashboard' },
    { Component: DashboardMarker, path: '/plans' },
  ]);
  const component = render(<Stub initialEntries={['/']} />);
  return { component, value };
};

describe('useCommanderOptions', () => {
  test('groups follow the navigation record it is given', () => {
    const { value } = renderCommanderOptions(dataNavigationV2);

    const groups = value.current;
    expect(groups).not.toBeNull();

    const headings = groups?.map((group) => group.heading) ?? [];
    expect(headings.length).toBeGreaterThan(0);
    expect(
      headings.every((heading) =>
        Object.keys(dataNavigationV2).includes(heading),
      ),
    ).toBe(true);
  });

  test('guest navigation produces guest groups', () => {
    const { value } = renderCommanderOptions(dataNavigationGuest);

    const headings = value.current?.map((group) => group.heading) ?? [];
    expect(
      headings.every((heading) =>
        Object.keys(dataNavigationGuest).includes(heading),
      ),
    ).toBe(true);
  });

  test('selecting an item navigates to its path', () => {
    const { component, value } = renderCommanderOptions(dataNavigationV2);

    const dashboardItem = value.current
      ?.flatMap((group) => group.items)
      .find((item) => item.id === 'nav-dashboard');

    const onSelect = dashboardItem?.onSelect;
    expect(onSelect).toBeDefined();
    if (onSelect == null) return;

    act(() => onSelect());

    expect(component.getByTestId('on-dashboard')).toBeInTheDocument();
  });
});
