import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { RulesTable } from '../RulesTable';
import type { RulesTableProps } from '../RulesTable';

describe('RulesTable Component', () => {
  let component: RenderResult;
  let props: RulesTableProps;

  const renderTable = (overrides?: Partial<RulesTableProps>): RenderResult => {
    const merged = { ...props, ...overrides };
    const Component = () => <RulesTable {...merged} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = {
      onDelete: vi.fn(),
      onToggleEnabled: vi.fn(),
      rules: [
        {
          actionPayloadJson: '{"placement":"first","skillSlug":"grilling"}',
          actionType: 'inject-task',
          enabled: true,
          environment: null,
          id: 'rule-1',
          status: 'PENDING',
          tagAll: ['breakdown'],
          title: 'Grill breakdowns',
        },
      ],
    };

    component = renderTable();
  });

  test('leads with the title and expresses the action summary', () => {
    expect(component.getByText('Grill breakdowns')).toBeInTheDocument();
    expect(component.getByText('inject-task')).toBeInTheDocument();
    expect(component.getByText('grilling · first')).toBeInTheDocument();
    expect(component.getByText('breakdown')).toBeInTheDocument();
    expect(
      component.getByText(`${RULES_COPY.statusLabel}: PENDING`),
    ).toBeInTheDocument();
  });

  test('edit links to the dedicated edit route', () => {
    expect(
      component.getByRole('link', { name: RULES_COPY.editAction }),
    ).toHaveAttribute('href', '/rules/rule-1/edit');
  });

  test('delegates delete and toggle to the callbacks', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', { name: RULES_COPY.deleteAction }),
    );
    await user.click(
      component.getByRole('button', { name: RULES_COPY.disableAction }),
    );

    expect(props.onDelete).toHaveBeenCalledWith('rule-1');
    expect(props.onToggleEnabled).toHaveBeenCalledWith(props.rules[0]);
  });

  test('shows the designed empty state when there are no rules', () => {
    const empty = renderTable({ rules: [] });

    expect(empty.getByText(RULES_COPY.emptyTitle)).toBeInTheDocument();
    expect(empty.getByText(RULES_COPY.emptyBody)).toBeInTheDocument();
  });
});
