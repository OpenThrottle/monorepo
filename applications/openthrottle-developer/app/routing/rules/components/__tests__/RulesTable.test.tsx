import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GLOBAL_POPOVER_COPY } from '@openthrottle/react-router-ui-global';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { RulesTable } from '../RulesTable';
import type { RulesTableProps } from '../RulesTable';

describe('RulesTable Component', () => {
  let component: RenderResult;
  let props: RulesTableProps;

  const renderTable = (overrides?: Partial<RulesTableProps>): RenderResult => {
    const merged = { ...props, ...overrides };
    const Component = () => <RulesTable {...merged} />;
    const RoutesStub = createRoutesStub([
      { Component, action: () => null, path: '/' },
    ]);
    return render(<RoutesStub />);
  };

  const openRowMenu = async (): Promise<void> => {
    const user = userEvent.setup();
    await user.click(
      component.getByRole('button', {
        name: `${RULES_COPY.menuAriaLabelPrefix} Grill breakdowns`,
      }),
    );
  };

  beforeEach(() => {
    cleanup();
    props = {
      onToggleEnabled: vi.fn(),
      rules: [
        {
          actionPayloadJson: '{"placement":"first","skillSlug":"grilling"}',
          actionType: 'inject-task',
          createdAt: '2026-01-01T00:00:00.000Z',
          enabled: true,
          environment: null,
          id: 'rule-1',
          status: 'PENDING',
          tagAll: ['breakdown'],
          title: 'Grill breakdowns',
          updatedAt: '2026-01-01T00:00:00.000Z',
          userId: 'user-1',
        },
      ],
    };

    component = renderTable();
  });

  test('renders table headers and leads with title plus action summary', () => {
    expect(component.getByTestId('RulesTable')).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', {
        name: RULES_COPY.tableRuleHeader,
      }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', {
        name: RULES_COPY.tableMatchHeader,
      }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', {
        name: GLOBAL_POPOVER_COPY.actionsHeader,
      }),
    ).toBeInTheDocument();
    expect(component.getByText('Grill breakdowns')).toBeInTheDocument();
    expect(component.getByText('inject-task')).toBeInTheDocument();
    expect(component.getByText('grilling · first')).toBeInTheDocument();
    expect(component.getByText('breakdown')).toBeInTheDocument();
    expect(
      component.getByText(`${RULES_COPY.statusLabel}: PENDING`),
    ).toBeInTheDocument();
  });

  test('title links to the dedicated edit route', () => {
    expect(
      component.getByRole('link', {
        name: `${RULES_COPY.editAction}: Grill breakdowns`,
      }),
    ).toHaveAttribute('href', '/rules/rule-1/edit');
  });

  test('delegates toggle and exposes edit/delete in the row menu', async () => {
    const user = userEvent.setup();
    await openRowMenu();

    expect(
      component.getByRole('menuitem', { name: RULES_COPY.editAction }),
    ).toHaveAttribute('href', '/rules/rule-1/edit');

    await user.click(
      component.getByRole('menuitem', { name: RULES_COPY.disableAction }),
    );
    expect(props.onToggleEnabled).toHaveBeenCalledWith(props.rules[0]);

    await openRowMenu();
    await user.click(
      component.getByRole('menuitem', { name: RULES_COPY.deleteAction }),
    );
    expect(
      component.getByRole('heading', { name: RULES_COPY.deleteConfirmTitle }),
    ).toBeInTheDocument();
  });

  test('shows RulesEmpty when there are no rules', () => {
    const empty = renderTable({ rules: [] });

    expect(empty.getByTestId('RulesEmpty')).toBeInTheDocument();
    expect(empty.getByText(RULES_COPY.emptyTitle)).toBeInTheDocument();
    expect(empty.getByText(RULES_COPY.emptyBody)).toBeInTheDocument();
    expect(
      empty.getByRole('link', { name: RULES_COPY.newRuleAction }),
    ).toHaveAttribute('href', '/rules/new');
  });

  test('shows filtered-empty via RulesEmpty when isFiltered and no rules', () => {
    const filtered = renderTable({ isFiltered: true, rules: [] });

    expect(filtered.getByTestId('RulesEmpty')).toBeInTheDocument();
    expect(
      filtered.getByText(RULES_COPY.filteredEmptyTitle),
    ).toBeInTheDocument();
    expect(
      filtered.getByText(RULES_COPY.filteredEmptyBody),
    ).toBeInTheDocument();
    expect(
      filtered.getByRole('link', { name: RULES_COPY.clearFiltersAction }),
    ).toHaveAttribute('href', '/rules');
  });

  describe('when a rule is disabled', () => {
    beforeEach(() => {
      cleanup();
      props = {
        onToggleEnabled: vi.fn(),
        rules: [
          {
            actionPayloadJson: '{}',
            actionType: 'inject-task',
            createdAt: '2026-01-02T00:00:00.000Z',
            enabled: false,
            environment: null,
            id: 'rule-2',
            status: null,
            tagAll: [],
            title: 'Disabled rule',
            updatedAt: '2026-01-02T00:00:00.000Z',
            userId: 'user-1',
          },
        ],
      };
      component = renderTable();
    });

    test('shows disabled badge, enable action, and matches-every-plan hint', async () => {
      const user = userEvent.setup();

      expect(
        component.getByText(RULES_COPY.filterDisabledLabel),
      ).toBeInTheDocument();
      expect(
        component.getByText(RULES_COPY.matchesEveryPlan),
      ).toBeInTheDocument();

      await user.click(
        component.getByRole('button', {
          name: `${RULES_COPY.menuAriaLabelPrefix} Disabled rule`,
        }),
      );
      await user.click(
        component.getByRole('menuitem', { name: RULES_COPY.enableAction }),
      );
      expect(props.onToggleEnabled).toHaveBeenCalledWith(props.rules[0]);
    });
  });
});
