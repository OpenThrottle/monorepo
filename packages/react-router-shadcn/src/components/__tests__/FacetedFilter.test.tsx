import type {
  FacetedFilterFooterAction,
  FacetedFilterOption,
} from '@openthrottle/react-router-shadcn';
import {
  FACETED_FILTER_COPY,
  FacetedFilter,
} from '@openthrottle/react-router-shadcn';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';

const opt = (
  value: string,
  group: string | undefined,
  count: number | undefined = undefined,
): FacetedFilterOption => ({
  adornment: <span data-testid={`dot-${value}`} />,
  count,
  group,
  label: value.toUpperCase(),
  value,
});

const OPTIONS: readonly FacetedFilterOption[] = [
  opt('a', 'Active'),
  opt('b', 'Active'),
  opt('c', 'Resolved'),
  opt('d', 'Resolved'),
];

interface Overrides {
  readonly footerActions: readonly FacetedFilterFooterAction[];
  readonly onChange: (value: string[]) => void;
  readonly options: readonly FacetedFilterOption[];
  readonly searchable: boolean;
  readonly value: readonly string[];
}

const setup = (overrides: Partial<Overrides>) => {
  const user = userEvent.setup();
  const onChange = vi.fn<(value: string[]) => void>();
  const component = render(
    <FacetedFilter
      footerActions={overrides.footerActions ?? []}
      maxBadges={2}
      onChange={overrides.onChange ?? onChange}
      options={overrides.options ?? OPTIONS}
      searchable={overrides.searchable ?? false}
      title="Status"
      value={overrides.value ?? []}
    />,
  );
  return { component, onChange, user };
};

const badgesIn = (trigger: HTMLElement): NodeListOf<Element> =>
  trigger.querySelectorAll('[data-slot="faceted-summary"] [data-slot="badge"]');

describe('FacetedFilter', () => {
  describe('trigger', () => {
    it('is a collapsed combobox until clicked', async () => {
      const { component, user } = setup({});
      const trigger = component.getByRole('combobox', { name: 'Status' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(await component.findByRole('listbox')).toHaveAttribute(
        'aria-multiselectable',
        'true',
      );
    });

    it('shows one badge per selection with its adornment up to maxBadges', () => {
      const { component } = setup({ value: ['a', 'c'] });
      const trigger = component.getByRole('combobox');
      expect(badgesIn(trigger)).toHaveLength(2);
      expect(component.getByTestId('dot-a')).toBeInTheDocument();
      expect(component.getByTestId('dot-c')).toBeInTheDocument();
    });

    it('collapses to a single summary badge past maxBadges', () => {
      const { component } = setup({ value: ['a', 'b', 'c'] });
      expect(badgesIn(component.getByRole('combobox'))).toHaveLength(1);
      expect(component.queryByTestId('dot-a')).toBeNull();
    });

    it('shows a single summary badge when nothing or everything is selected', () => {
      const empty = setup({ value: [] });
      expect(badgesIn(empty.component.getByRole('combobox'))).toHaveLength(1);
      empty.component.unmount();

      const all = setup({ value: ['a', 'b', 'c', 'd'] });
      expect(badgesIn(all.component.getByRole('combobox'))).toHaveLength(1);
    });
  });

  describe('rows', () => {
    it('expose checked state per option', async () => {
      const { component, user } = setup({ value: ['b'] });
      await user.click(component.getByRole('combobox'));
      const rows = component
        .getAllByRole('option')
        .filter((row) => row.dataset['slot'] === 'faceted-option');
      expect(rows.map((row) => row.getAttribute('aria-checked'))).toEqual([
        'false',
        'true',
        'false',
        'false',
      ]);
    });

    it('emits the toggled selection in options order', async () => {
      const { component, onChange, user } = setup({ value: ['c'] });
      await user.click(component.getByRole('combobox'));
      await user.click(component.getByRole('option', { name: 'A' }));
      expect(onChange).toHaveBeenLastCalledWith(['a', 'c']);

      await user.click(component.getByRole('option', { name: 'C' }));
      expect(onChange).toHaveBeenLastCalledWith([]);
    });

    it('renders a count slot only when a count is given', async () => {
      const { component, user } = setup({
        options: [opt('a', undefined, 7), opt('b', undefined)],
      });
      await user.click(component.getByRole('combobox'));
      expect(component.getByRole('option', { name: /^A/ })).toHaveTextContent(
        '7',
      );
      expect(component.getByRole('option', { name: /^B/ })).toHaveTextContent(
        /^B$/,
      );
    });
  });

  describe('groups', () => {
    it('selects the whole group from its header when partly selected', async () => {
      const { component, onChange, user } = setup({ value: ['a', 'c'] });
      await user.click(component.getByRole('combobox'));
      const [active] = component
        .getAllByRole('option')
        .filter((row) => row.dataset['slot'] === 'faceted-group-toggle');
      if (!active) throw new Error('group header missing');
      await user.click(active);
      expect(onChange).toHaveBeenLastCalledWith(['a', 'b', 'c']);
    });

    it('clears the whole group from its header when fully selected', async () => {
      const { component, onChange, user } = setup({ value: ['a', 'b', 'c'] });
      await user.click(component.getByRole('combobox'));
      const [active] = component
        .getAllByRole('option')
        .filter((row) => row.dataset['slot'] === 'faceted-group-toggle');
      if (!active) throw new Error('group header missing');
      await user.click(active);
      expect(onChange).toHaveBeenLastCalledWith(['c']);
    });

    it('renders no header for ungrouped options', async () => {
      const { component, user } = setup({
        options: [opt('a', undefined), opt('b', undefined)],
      });
      await user.click(component.getByRole('combobox'));
      expect(component.getAllByRole('option')).toHaveLength(2);
    });
  });

  describe('footer actions', () => {
    it('runs an enabled action and disables an inactive one', async () => {
      const reset = vi.fn();
      const { component, user } = setup({
        footerActions: [
          { disabled: false, label: 'Reset', onSelect: reset },
          { disabled: true, label: 'Everything', onSelect: vi.fn() },
        ],
      });
      await user.click(component.getByRole('combobox'));
      await user.click(component.getByRole('button', { name: 'Reset' }));
      expect(reset).toHaveBeenCalledTimes(1);
      expect(
        component.getByRole('button', { name: 'Everything' }),
      ).toBeDisabled();
    });
  });

  describe('search', () => {
    it('is absent unless searchable', async () => {
      const { component, user } = setup({});
      await user.click(component.getByRole('combobox'));
      expect(component.queryByRole('textbox')).toBeNull();
    });

    it('filters rows when searchable', async () => {
      const { component, user } = setup({
        options: [opt('alpha', undefined), opt('beta', undefined)],
        searchable: true,
      });
      await user.click(component.getByRole('combobox'));
      await user.type(
        component.getByPlaceholderText(
          FACETED_FILTER_COPY.searchPlaceholder('Status'),
        ),
        'bet',
      );
      await waitFor(() =>
        expect(component.getAllByRole('option')).toHaveLength(1),
      );
    });
  });

  describe('keyboard', () => {
    it('moves with arrows and toggles with Enter and Space', async () => {
      const { component, onChange, user } = setup({
        options: [opt('a', undefined), opt('b', undefined)],
      });
      await user.click(component.getByRole('combobox'));
      await user.keyboard('{ArrowDown}{Enter}');
      expect(onChange).toHaveBeenLastCalledWith(['b']);

      await user.keyboard('{ArrowUp}[Space]');
      expect(onChange).toHaveBeenLastCalledWith(['a']);
    });

    it('closes on Escape', async () => {
      const { component, user } = setup({});
      const trigger = component.getByRole('combobox');
      await user.click(trigger);
      await user.keyboard('{Escape}');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
