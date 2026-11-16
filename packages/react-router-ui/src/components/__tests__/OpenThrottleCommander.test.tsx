import type { RenderResult } from '@testing-library/react';
import { cleanup, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type {
  CommanderGroup,
  CommanderItem,
  OpenThrottleCommanderProps,
} from '../OpenThrottleCommander';
import { OpenThrottleCommander } from '../OpenThrottleCommander';

describe('OpenThrottleCommander Component', () => {
  let component: RenderResult;
  let props: OpenThrottleCommanderProps;

  /**
   * @description `resolveAsync` mimics the developer app's debounced id
   * lookup: its rows land a tick after the query that asked for them.
   */
  const renderCommander = (
    p: OpenThrottleCommanderProps,
    resolveAsync?: (query: string) => readonly CommanderItem[],
  ): RenderResult => {
    const Comp = () => {
      const [resolvedFor, setResolvedFor] = React.useState('');
      if (!resolveAsync) {
        return <OpenThrottleCommander {...p} />;
      }
      const handleSearchChange = (query: string): void => {
        setTimeout(() => {
          setResolvedFor(query.trim());
        }, 20);
      };
      const emptyStateExtras = (query: string) => {
        return resolvedFor === query ? resolveAsync(query) : [];
      };
      return (
        <OpenThrottleCommander
          {...p}
          emptyStateExtras={emptyStateExtras}
          onSearchChange={handleSearchChange}
        />
      );
    };
    const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
    return render(<RoutesStub />);
  };

  const openCommandPalette = async (
    user: ReturnType<typeof userEvent.setup>,
    view: RenderResult,
  ): Promise<HTMLElement> => {
    await user.keyboard('{Meta>}k{/Meta}');
    const dialog = await waitFor(() => {
      const dialogs = view.getAllByRole('dialog');
      expect(dialogs.length).toBeGreaterThan(0);
      return dialogs[dialogs.length - 1]!;
    });
    expect(dialog).toBeInTheDocument();
    return dialog;
  };

  const getCommandInput = (
    view: RenderResult,
    dialog?: HTMLElement,
  ): HTMLElement => {
    const root = dialog ? within(dialog) : view;
    return root.getByRole('combobox');
  };

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    props = { groups: [] };
  });

  test('opens the command palette via keyboard shortcut', async () => {
    const user = userEvent.setup();
    component = renderCommander(props);
    await openCommandPalette(user, component);
  });

  test('should render with empty groups when open', () => {
    component = renderCommander({ ...props, defaultOpen: true });
    expect(component.getByTestId('OpenThrottleCommander')).toBeInTheDocument();
  });

  test('should open dialog when trigger is clicked and show groups/items', async () => {
    const user = userEvent.setup();
    const groups: readonly CommanderGroup[] = [
      {
        heading: 'Navigation',
        items: [
          {
            id: 'nav-1',
            label: 'Dashboard',
            onSelect: () => {},
          },
        ],
      },
    ];
    component = renderCommander({ ...props, groups });
    const dialog = await openCommandPalette(user, component);
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Navigation')).toBeInTheDocument();
    expect(within(dialog).getByText('Dashboard')).toBeInTheDocument();
  });

  test('should call onSelect when item is selected and close dialog', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const groups: readonly CommanderGroup[] = [
      {
        heading: 'Actions',
        items: [{ id: 'act-1', label: 'Do thing', onSelect }],
      },
    ];
    component = renderCommander({ ...props, groups });
    const dialog = await openCommandPalette(user, component);
    await user.click(within(dialog).getByRole('option', { name: 'Do thing' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('abstract options shape', () => {
    test('should display item shortcut when provided', async () => {
      const user = userEvent.setup();
      const groups: readonly CommanderGroup[] = [
        {
          heading: 'Nav',
          items: [
            {
              id: 'n1',
              label: 'Plans',
              onSelect: () => {},
              shortcut: '⌘P',
            },
          ],
        },
      ];
      component = renderCommander({ ...props, groups });
      const dialog = await openCommandPalette(user, component);
      expect(within(dialog).getByText('⌘P')).toBeInTheDocument();
    });

    test('should use custom placeholder when provided', async () => {
      const user = userEvent.setup();
      component = renderCommander({
        ...props,
        placeholder: 'Search commands...',
      });
      const dialog = await openCommandPalette(user, component);
      const input = getCommandInput(component, dialog);
      expect(input).toHaveAttribute('placeholder', 'Search commands...');
    });

    test('should render multiple groups with headings and items', async () => {
      const user = userEvent.setup();
      const groups: readonly CommanderGroup[] = [
        {
          heading: 'Navigation',
          items: [{ id: 'a', label: 'Dashboard', onSelect: () => {} }],
        },
        {
          heading: 'Actions',
          items: [{ id: 'b', label: 'New item', onSelect: () => {} }],
        },
      ];
      component = renderCommander({ ...props, groups });
      const dialog = await openCommandPalette(user, component);
      expect(within(dialog).getByText('Navigation')).toBeInTheDocument();
      expect(within(dialog).getByText('Dashboard')).toBeInTheDocument();
      expect(within(dialog).getByText('Actions')).toBeInTheDocument();
      expect(within(dialog).getByText('New item')).toBeInTheDocument();
    });
  });

  describe('empty-state search', () => {
    test('should show Search for [query] when onEmptyStateSearch provided and query has no matches', async () => {
      const user = userEvent.setup();
      const onEmptyStateSearch = vi.fn();
      const groups: readonly CommanderGroup[] = [
        {
          heading: 'Nav',
          items: [{ id: 'n1', label: 'Plans', onSelect: () => {} }],
        },
      ];
      component = renderCommander({
        ...props,
        groups,
        onEmptyStateSearch,
      });
      const dialog = await openCommandPalette(user, component);
      const input = getCommandInput(component, dialog);
      await user.type(input, 'xyznomatch');
      expect(
        within(dialog).getByRole('option', {
          name: 'Search for "xyznomatch"',
        }),
      ).toBeInTheDocument();
      await user.click(
        within(dialog).getByRole('option', {
          name: 'Search for "xyznomatch"',
        }),
      );
      expect(onEmptyStateSearch).toHaveBeenCalledWith('xyznomatch');
      expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('puts Search before fallback extras and highlights it when nothing matches', async () => {
      const user = userEvent.setup();
      const onEmptyStateSearch = vi.fn();
      const onBrowse = vi.fn();
      component = renderCommander({
        ...props,
        emptyStateExtras: (query: string) => [
          {
            id: 'browse-plans',
            isFallback: true,
            label: 'Browse plans',
            onSelect: onBrowse,
            value: `${query} browse plans`,
          },
        ],
        groups: [
          {
            heading: 'Nav',
            items: [{ id: 'n1', label: 'Plans', onSelect: () => {} }],
          },
        ],
        onEmptyStateSearch,
      });
      const dialog = await openCommandPalette(user, component);
      await user.type(getCommandInput(component, dialog), 'argo cd');

      const options = within(dialog).getAllByRole('option');
      expect(options[0]).toBe(
        within(dialog).getByTestId('OpenThrottleCommander-search'),
      );
      await waitFor(() => {
        expect(options[0]).toHaveAttribute('aria-selected', 'true');
      });

      await user.keyboard('{Enter}');
      expect(onEmptyStateSearch).toHaveBeenCalledWith('argo cd');
      expect(onBrowse).not.toHaveBeenCalled();
    });

    test('keeps non-fallback extras (real matches) ahead of Search', async () => {
      const user = userEvent.setup();
      component = renderCommander({
        ...props,
        emptyStateExtras: (query: string) => [
          {
            id: 'browse-plans',
            isFallback: true,
            label: 'Browse plans',
            value: `${query} browse plans`,
          },
          {
            id: 'open-plan-abc123',
            label: 'Open plan: Ship it',
            value: `${query} open plan`,
          },
        ],
        onEmptyStateSearch: vi.fn(),
      });
      const dialog = await openCommandPalette(user, component);
      await user.type(getCommandInput(component, dialog), 'abc123');

      const options = within(dialog).getAllByRole('option');
      expect(
        options.map((option) => {
          return option.dataset['testid'];
        }),
      ).toEqual([
        'CommanderItemRow',
        'OpenThrottleCommander-search',
        'CommanderItemRow',
      ]);
      expect(options[0]).toHaveTextContent('Open plan: Ship it');
    });

    test('renders an empty-state extra trailing node beside its label', async () => {
      const user = userEvent.setup();
      component = renderCommander({
        ...props,
        emptyStateExtras: () => [
          {
            id: 'jump-plan-abc123',
            label: 'Open plan: Ship it (abc123…)',
            onSelect: () => {},
            trailing: <span data-testid="status-badge">In progress</span>,
            value: 'abc123 open plan',
          },
        ],
        groups: [],
      });
      const dialog = await openCommandPalette(user, component);
      await user.type(getCommandInput(component, dialog), 'abc123');

      const trailing = await within(dialog).findByTestId(
        'CommanderItemRow-trailing',
      );
      expect(trailing).toContainElement(
        within(dialog).getByTestId('status-badge'),
      );
    });

    test('should render UUID debug jumps when emptyStateExtras returns items', async () => {
      const user = userEvent.setup();
      const planId = 'c65fb0f7-56ae-43bb-b516-dfd41fda7985';
      // Typing a full UUID drives many cmdk re-filters; allow extra headroom
      // when the suite runs under parallel load.
      const onJumpPlan = vi.fn();
      const onJumpQueue = vi.fn();
      const groups: readonly CommanderGroup[] = [
        {
          heading: 'Nav',
          items: [{ id: 'n1', label: 'Plans', onSelect: () => {} }],
        },
      ];
      component = renderCommander({
        ...props,
        emptyStateExtras: () => [
          {
            id: `jump-plan-${planId}`,
            label: `Open plan (${planId.slice(0, 8)}…)`,
            onSelect: onJumpPlan,
            value: `${planId} open plan`,
          },
          {
            id: `jump-queue-${planId}`,
            label: `Open queue (${planId.slice(0, 8)}…)`,
            onSelect: onJumpQueue,
            value: `${planId} open queue`,
          },
        ],
        groups,
      });
      const dialog = await openCommandPalette(user, component);
      const input = getCommandInput(component, dialog);
      await user.type(input, planId);
      expect(
        within(dialog).getByRole('option', {
          name: `Open plan (${planId.slice(0, 8)}…)`,
        }),
      ).toBeInTheDocument();
      await user.click(
        within(dialog).getByRole('option', {
          name: `Open plan (${planId.slice(0, 8)}…)`,
        }),
      );
      expect(onJumpPlan).toHaveBeenCalledTimes(1);
      expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('should not show Search option when onEmptyStateSearch is not provided', async () => {
      const user = userEvent.setup();
      const groups: readonly CommanderGroup[] = [
        {
          heading: 'Nav',
          items: [{ id: 'n1', label: 'Plans', onSelect: () => {} }],
        },
      ];
      component = renderCommander({ ...props, groups });
      const dialog = await openCommandPalette(user, component);
      const input = getCommandInput(component, dialog);
      await user.type(input, 'xyznomatch');
      expect(
        within(dialog).getByText(/No matching commands\. Type to filter/),
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByRole('option', { name: /Search for/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe('async-resolved id rows', () => {
    const renderAsyncResolver = (
      onOpenPlan: () => void,
      onOpenTask: () => void,
    ): RenderResult => {
      return renderCommander(
        {
          groups: [
            {
              heading: 'Nav',
              items: [{ id: 'n1', label: 'Plans', onSelect: () => {} }],
            },
          ],
          onEmptyStateSearch: () => {},
        },
        (query) => [
          {
            id: 'jump-plan',
            label: 'Open plan: Ship it',
            onSelect: onOpenPlan,
            value: `${query} open plan`,
          },
          {
            id: 'jump-task',
            label: 'Open task: Wire it',
            onSelect: onOpenTask,
            value: `${query} open task`,
          },
        ],
      );
    };

    test('Enter opens the first resolved row once it arrives', async () => {
      const user = userEvent.setup();
      const onOpenPlan = vi.fn();
      const onOpenTask = vi.fn();
      component = renderAsyncResolver(onOpenPlan, onOpenTask);
      const dialog = await openCommandPalette(user, component);
      await user.type(getCommandInput(component, dialog), '316daa7a');
      const row = await within(dialog).findByRole('option', {
        name: 'Open plan: Ship it',
      });
      await waitFor(() => {
        expect(row).toHaveAttribute('aria-selected', 'true');
      });

      await user.keyboard('{Enter}');

      expect(onOpenPlan).toHaveBeenCalledTimes(1);
      expect(onOpenTask).not.toHaveBeenCalled();
    });

    test('keeps a highlight the user moved', async () => {
      const user = userEvent.setup();
      const onOpenPlan = vi.fn();
      const onOpenTask = vi.fn();
      component = renderAsyncResolver(onOpenPlan, onOpenTask);
      const dialog = await openCommandPalette(user, component);
      await user.type(getCommandInput(component, dialog), '316daa7a');
      const planRow = await within(dialog).findByRole('option', {
        name: 'Open plan: Ship it',
      });
      await waitFor(() => {
        expect(planRow).toHaveAttribute('aria-selected', 'true');
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(onOpenTask).toHaveBeenCalledTimes(1);
      expect(onOpenPlan).not.toHaveBeenCalled();
    });
  });

  describe('controlled open state', () => {
    test('should show dialog when open is true without clicking trigger', () => {
      const onOpenChange = vi.fn();
      component = renderCommander({
        ...props,
        groups: [
          {
            heading: 'G',
            items: [{ id: '1', label: 'Item', onSelect: () => {} }],
          },
        ],
        onOpenChange,
        open: true,
      });
      expect(component.getByRole('dialog')).toBeInTheDocument();
      expect(component.getByText('Item')).toBeInTheDocument();
    });

    test('should call onOpenChange when dialog close is requested', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      component = renderCommander({
        ...props,
        groups: [
          {
            heading: 'G',
            items: [{ id: '1', label: 'Item', onSelect: () => {} }],
          },
        ],
        onOpenChange,
        open: true,
      });
      expect(component.getByRole('dialog')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
