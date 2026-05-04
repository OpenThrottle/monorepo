import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { OpenThrottleCommander } from '../OpenThrottleCommander';
import type {
  CommanderGroup,
  OpenThrottleCommanderProps,
} from '../OpenThrottleCommander';

describe('OpenThrottleCommander Component', () => {
  let component: RenderResult;
  let props: OpenThrottleCommanderProps;

  const renderCommander = (p: OpenThrottleCommanderProps): RenderResult => {
    const Comp = () => <OpenThrottleCommander {...p} />;
    const RoutesStub = createRoutesStub([{ Component: Comp, path: '/' }]);
    return render(<RoutesStub />);
  };

  beforeEach(() => {
    props = { groups: [] };
    component = renderCommander(props);
  });

  test('should render trigger button', () => {
    const trigger = component.getByRole('button', {
      name: 'Open command palette',
    });
    expect(trigger).toBeInTheDocument();
  });

  test('should render with empty groups', () => {
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
    const trigger = component.getByRole('button', {
      name: 'Open command palette',
    });
    await user.click(trigger);
    const dialog = component.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(component.getByText('Navigation')).toBeInTheDocument();
    expect(component.getByText('Dashboard')).toBeInTheDocument();
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
    await user.click(
      component.getByRole('button', { name: 'Open command palette' }),
    );
    expect(component.getByRole('dialog')).toBeInTheDocument();
    await user.click(component.getByText('Do thing'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(component.queryByRole('dialog')).not.toBeInTheDocument();
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
      await user.click(
        component.getByRole('button', { name: 'Open command palette' }),
      );
      expect(component.getByText('⌘P')).toBeInTheDocument();
    });

    test('should use custom placeholder when provided', async () => {
      const user = userEvent.setup();
      component = renderCommander({
        ...props,
        placeholder: 'Search commands...',
      });
      await user.click(
        component.getByRole('button', { name: 'Open command palette' }),
      );
      const input = component.getByPlaceholderText('Search commands...');
      expect(input).toBeInTheDocument();
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
      await user.click(
        component.getByRole('button', { name: 'Open command palette' }),
      );
      expect(component.getByText('Navigation')).toBeInTheDocument();
      expect(component.getByText('Dashboard')).toBeInTheDocument();
      expect(component.getByText('Actions')).toBeInTheDocument();
      expect(component.getByText('New item')).toBeInTheDocument();
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
      await user.click(
        component.getByRole('button', { name: 'Open command palette' }),
      );
      const input = component.getByPlaceholderText(
        'Type a command or search...',
      );
      await user.type(input, 'xyznomatch');
      expect(
        component.getByRole('option', { name: 'Search for "xyznomatch"' }),
      ).toBeInTheDocument();
      await user.click(
        component.getByRole('option', { name: 'Search for "xyznomatch"' }),
      );
      expect(onEmptyStateSearch).toHaveBeenCalledWith('xyznomatch');
      expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('should render UUID debug jumps when emptyStateExtras returns items', async () => {
      const user = userEvent.setup();
      const planId = 'c65fb0f7-56ae-43bb-b516-dfd41fda7985';
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
      await user.click(
        component.getByRole('button', { name: 'Open command palette' }),
      );
      await user.type(
        component.getByPlaceholderText('Type a command or search...'),
        planId,
      );
      expect(
        component.getByRole('option', {
          name: `Open plan (${planId.slice(0, 8)}…)`,
        }),
      ).toBeInTheDocument();
      await user.click(
        component.getByRole('option', {
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
      await user.click(
        component.getByRole('button', { name: 'Open command palette' }),
      );
      await user.type(
        component.getByPlaceholderText('Type a command or search...'),
        'xyznomatch',
      );
      expect(
        component.getByText(/No matching commands\. Type to filter/),
      ).toBeInTheDocument();
      expect(
        component.queryByRole('option', { name: /Search for/ }),
      ).not.toBeInTheDocument();
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
