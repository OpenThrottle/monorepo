import { GLOBAL_POPOVER_COPY } from '@openthrottle/react-router-ui-global';
import type { RenderResult } from '@testing-library/react';
import { cleanup, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RULES_COPY } from '~/routing/rules/data/data.copy';

import type { RulesTableProps } from '../RulesTable';
import { RulesTable } from '../RulesTable';

describe('RulesTable Component', () => {
  let component: RenderResult;
  let props: RulesTableProps;

  const renderTable = (overrides?: Partial<RulesTableProps>): RenderResult => {
    const merged = { ...props, ...overrides };
    const Component = () => {
      return <RulesTable {...merged} />;
    };
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
      projects: [],
      repositories: [],
      rules: [
        {
          actionPayloadJson: '{"placement":"first","skillSlug":"grilling"}',
          actionType: 'inject-task',
          createdAt: '2026-01-01T00:00:00.000Z',
          enabled: true,
          environment: null,
          id: 'rule-1',
          repositoryId: null,
          specificity: 2,
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
      component.getByRole('columnheader', { name: RULES_COPY.scopeHeader }),
    ).toBeInTheDocument();
  });

  test('renders a Global badge trail ending in the status', () => {
    const trail = component.getByTestId('RulesScopeBadges');

    expect(within(trail).getAllByRole('listitem')).toHaveLength(2);
    expect(within(trail).getByText(RULES_COPY.scopeGlobalLabel)).toBeVisible();
    expect(within(trail).getByText('PENDING')).toBeVisible();
  });

  test('title links to the rule detail route', () => {
    expect(
      component.getByRole('link', {
        name: `${RULES_COPY.viewAction}: Grill breakdowns`,
      }),
    ).toHaveAttribute('href', '/rules/rule-1');
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
        projects: [],
        repositories: [],
        rules: [
          {
            actionPayloadJson: '{}',
            actionType: 'inject-task',
            createdAt: '2026-01-02T00:00:00.000Z',
            enabled: false,
            environment: null,
            id: 'rule-2',
            repositoryId: null,
            specificity: 0,
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

  describe('when rules span repositories', () => {
    const makeRule = (
      id: string,
      overrides: Partial<RulesTableProps['rules'][number]>,
    ): RulesTableProps['rules'][number] => {
      return {
        actionPayloadJson: '{}',
        actionType: 'inject-task',
        createdAt: '2026-01-01T00:00:00.000Z',
        enabled: true,
        environment: null,
        id,
        repositoryId: null,
        specificity: 0,
        status: null,
        tagAll: [],
        title: `Rule ${id}`,
        updatedAt: '2026-01-01T00:00:00.000Z',
        userId: 'user-1',
        ...overrides,
      };
    };

    beforeEach(() => {
      cleanup();
      props = {
        onToggleEnabled: vi.fn(),
        projects: [],
        repositories: [
          { id: 'repo-b', name: 'website' },
          { id: 'repo-a', name: 'monorepo' },
        ],
        rules: [
          makeRule('web', { repositoryId: 'repo-b', specificity: 2 }),
          makeRule('gone', { repositoryId: 'repo-deleted', specificity: 2 }),
          makeRule('mono-wide', { repositoryId: 'repo-a', specificity: 2 }),
          makeRule('mono-narrow', {
            environment: 'staging',
            repositoryId: 'repo-a',
            specificity: 3,
          }),
          makeRule('global', {}),
        ],
      };
      component = renderTable();
    });

    const groupAt = (index: number): HTMLElement => {
      const group = component.getAllByTestId('RulesTableGroup')[index];
      if (group === undefined) {
        throw new Error(`No group at index ${index}`);
      }
      return group;
    };

    const groupNames = (): string[] => {
      return component
        .getAllByTestId('RulesTableGroup')
        .map((group) => group.getAttribute('data-group-kind') ?? '');
    };

    test('orders groups Global, repositories by name, then unknown', () => {
      expect(groupNames()).toEqual([
        'global',
        'repository',
        'repository',
        'unknown',
      ]);

      const headings = component
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent ?? '');

      expect(headings[1]).toContain('monorepo');
      expect(headings[2]).toContain('website');
      expect(headings[3]).toContain(RULES_COPY.scopeUnknownRepositoryLabel);
    });

    test('lists the narrowest rule first inside a repository group', () => {
      const monorepoGroup = groupAt(1);
      const links = within(monorepoGroup).getAllByRole('link');

      expect(links[0]).toHaveAttribute('href', '/rules/mono-narrow');
      expect(links[1]).toHaveAttribute('href', '/rules/mono-wide');
    });

    test('shows the repository name then environment in the trail', () => {
      const monorepoGroup = groupAt(1);
      const [trail] = within(monorepoGroup).getAllByTestId('RulesScopeBadges');
      const kinds = within(trail ?? monorepoGroup)
        .getAllByRole('listitem')
        .map((item) => {
          return item
            .querySelector('[data-scope-kind]')
            ?.getAttribute('data-scope-kind');
        });

      expect(kinds).toEqual(['repository', 'environment']);
    });

    test('keeps a rule with a dangling repository id visible as unknown', () => {
      const unknownGroup = groupAt(3);

      expect(
        within(unknownGroup).getByRole('link', {
          name: `${RULES_COPY.viewAction}: Rule gone`,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('when rules are scoped to a project', () => {
    const makeRule = (
      id: string,
      overrides: Partial<RulesTableProps['rules'][number]>,
    ): RulesTableProps['rules'][number] => {
      return {
        actionPayloadJson: '{}',
        actionType: 'inject-task',
        createdAt: '2026-01-01T00:00:00.000Z',
        enabled: true,
        environment: null,
        id,
        projectId: null,
        repositoryId: null,
        specificity: 0,
        status: null,
        tagAll: [],
        title: `Rule ${id}`,
        updatedAt: '2026-01-01T00:00:00.000Z',
        userId: 'user-1',
        ...overrides,
      };
    };

    beforeEach(() => {
      cleanup();
      component = renderTable({
        projects: [{ id: 'proj-1', name: 'Platform' }],
        repositories: [],
        rules: [
          makeRule('proj-rule', { projectId: 'proj-1', specificity: 2 }),
          makeRule('global', {}),
        ],
      });
    });

    test('groups a project-only rule under its project, after Global', () => {
      const kinds = component
        .getAllByTestId('RulesTableGroup')
        .map((group) => group.getAttribute('data-group-kind'));

      expect(kinds).toEqual(['global', 'project']);
    });

    test('shows the project in the scope trail', () => {
      const badge = component
        .getAllByTestId('RulesScopeBadges')
        .map((trail) => trail.querySelector('[data-scope-kind="project"]'))
        .find((node) => node != null);

      expect(badge).toHaveTextContent('Platform');
    });
  });
});
