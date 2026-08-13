import * as React from 'react';
import { act, render } from '@testing-library/react';
import type { CommanderGroup } from '@openthrottle/react-router-ui';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { useCommanderOptions } from '../useCommanderOptions';

function HookProbe(props: {
  readonly value: { current: CommanderGroup[] | null };
}): null {
  props.value.current = useCommanderOptions();
  return null;
}

// eslint-disable-next-line react/no-multi-comp
function DashboardMarker(): React.ReactElement {
  return <div data-testid="on-dashboard" />;
}

const renderCommanderOptions = (): {
  readonly component: ReturnType<typeof render>;
  readonly value: { current: CommanderGroup[] | null };
} => {
  const value: { current: CommanderGroup[] | null } = { current: null };
  const Stub = createRoutesStub([
    // eslint-disable-next-line react/no-multi-comp
    { Component: () => <HookProbe value={value} />, path: '/' },
    { Component: DashboardMarker, path: '/dashboard' },
    { Component: DashboardMarker, path: '/plans' },
  ]);
  const component = render(<Stub initialEntries={['/']} />);
  return { component, value };
};

describe('useCommanderOptions', () => {
  test('returns a Navigation group with the expected items', () => {
    const { value } = renderCommanderOptions();

    const groups = value.current;
    expect(groups).not.toBeNull();

    const navigation = groups?.find((group) => group.heading === 'Navigation');
    expect(navigation).toBeDefined();

    const ids = navigation?.items.map((item) => item.id);
    expect(ids).toEqual([
      'nav-dashboard',
      'nav-plans',
      'nav-projects',
      'nav-queues',
      'nav-notes',
    ]);
  });

  test('selecting an item navigates to its path', () => {
    const { component, value } = renderCommanderOptions();

    const navigation = value.current?.find(
      (group) => group.heading === 'Navigation',
    );
    const dashboardItem = navigation?.items.find(
      (item) => item.id === 'nav-dashboard',
    );
    const onSelect = dashboardItem?.onSelect;
    expect(onSelect).toBeDefined();
    if (onSelect == null) return;

    act(() => onSelect());

    expect(component.getByTestId('on-dashboard')).toBeInTheDocument();
  });
});
