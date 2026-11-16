import { Command, CommandList } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { CommanderItemRowProps } from '../CommanderItemRow';
import { CommanderItemRow } from '../CommanderItemRow';

const renderRow = (props: CommanderItemRowProps): RenderResult => {
  return render(
    <Command>
      <CommandList>
        <CommanderItemRow {...props} />
      </CommandList>
    </Command>,
  );
};

describe('CommanderItemRow Component', () => {
  describe('without a trailing node', () => {
    test('renders the label and no trailing slot', () => {
      const component = renderRow({
        className: undefined,
        forceMount: undefined,
        item: { id: 'plans', label: 'Plans' },
        keywords: undefined,
        onSelect: vi.fn(),
      });

      expect(component.getByRole('option', { name: 'Plans' })).toBeVisible();
      expect(
        component.queryByTestId('CommanderItemRow-trailing'),
      ).not.toBeInTheDocument();
    });
  });

  describe('with a trailing node', () => {
    test('renders the trailing node after the label', () => {
      const component = renderRow({
        className: undefined,
        forceMount: undefined,
        item: {
          id: 'plan-1',
          label: 'Open plan: Ship it',
          trailing: <span data-testid="status-badge">In progress</span>,
        },
        keywords: undefined,
        onSelect: vi.fn(),
      });

      const trailing = component.getByTestId('CommanderItemRow-trailing');
      expect(trailing).toContainElement(component.getByTestId('status-badge'));
      expect(trailing).toHaveClass('ml-auto', 'shrink-0');
    });
  });

  describe('selection', () => {
    test('passes the item to onSelect', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      const item = { id: 'plans', label: 'Plans' };
      const component = renderRow({
        className: undefined,
        forceMount: undefined,
        item,
        keywords: undefined,
        onSelect,
      });

      await user.click(component.getByRole('option', { name: 'Plans' }));

      expect(onSelect).toHaveBeenCalledExactlyOnceWith(item);
    });
  });
});
