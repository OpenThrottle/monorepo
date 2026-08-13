import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useSearchParams } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { AgentSearchTabs } from '../AgentSearchTabs';
import type { AgentSearchTabsProps } from '../AgentSearchTabs';

const renderTabs = (
  tabsProps: AgentSearchTabsProps,
  initialEntries?: readonly string[],
): RenderResult => {
  const Component = (): React.ReactElement => {
    const [searchParams] = useSearchParams();

    return (
      <>
        <AgentSearchTabs {...tabsProps} />
        <p data-testid="current-type">{searchParams.get('type') ?? 'all'}</p>
      </>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(
    <RoutesStub
      initialEntries={initialEntries ? [...initialEntries] : undefined}
    />,
  );
};

describe('AgentSearchTabs Component', () => {
  let component: RenderResult;
  let props: AgentSearchTabsProps;

  beforeEach(() => {
    props = {
      counts: { all: 10, personas: 2, rules: 3, skills: 5 },
      tab: 'all',
    };

    component = renderTabs(props);
  });

  test('renders a tab per prompt type with its result count', () => {
    expect(component.getByTestId('AgentSearchTabs')).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: 'All (10)' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: 'Skills (5)' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: 'Rules (3)' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: 'Personas (2)' }),
    ).toBeInTheDocument();
  });

  test('selecting a non-"all" tab sets the type search param', async () => {
    const user = userEvent.setup();

    await user.click(component.getByRole('tab', { name: 'Skills (5)' }));

    expect(component.getByTestId('current-type')).toHaveTextContent('skills');
  });

  test('selecting the "all" tab clears the type search param', async () => {
    component.unmount();
    component = renderTabs({ ...props, tab: 'skills' }, ['/?type=skills']);

    const user = userEvent.setup();
    await user.click(component.getByRole('tab', { name: 'All (10)' }));

    expect(component.getByTestId('current-type')).toHaveTextContent('all');
  });
});
