import type { RenderResult } from '@testing-library/react';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import {
  DEFAULT_STATUSES,
  STATUS_OPTIONS,
} from '~/routing/plans/config/status-options';
import { PLAN_STATUS_FILTER_COPY } from '~/routing/plans/data/data.copy';
import { planStatusValues } from '~/routing/plans/types';

import { PlanStatusFilter } from '../PlanStatusFilter';

const renderFilter = (
  value: readonly string[],
  onChange: (value: string[]) => void = vi.fn(),
): RenderResult =>
  render(<PlanStatusFilter onChange={onChange} value={value} />);

const openFilter = async (component: RenderResult): Promise<HTMLElement> => {
  await userEvent.click(
    component.getByRole('combobox', { name: PLAN_STATUS_FILTER_COPY.title }),
  );
  return component.findByRole('listbox');
};

const rowsWithSlot = (listbox: HTMLElement, slot: string): HTMLElement[] =>
  within(listbox)
    .getAllByRole('option')
    .filter((row) => row.dataset['slot'] === slot);

describe('PlanStatusFilter', () => {
  test('trigger is a collapsed combobox', () => {
    const component = renderFilter(['IN_PROGRESS']);

    expect(
      component.getByRole('combobox', { name: PLAN_STATUS_FILTER_COPY.title }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  test('lists every status with its human label, checked per the value', async () => {
    const component = renderFilter(['IN_PROGRESS', 'QUEUED']);
    const listbox = await openFilter(component);
    const rows = rowsWithSlot(listbox, 'faceted-option');

    expect(rows.map((row) => row.textContent)).toEqual(
      STATUS_OPTIONS.map((status) => planStatusValues[status]),
    );
    expect(
      within(listbox).getByRole('option', {
        name: planStatusValues.IN_PROGRESS,
      }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      within(listbox).getByRole('option', { name: planStatusValues.BACKLOG }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  test('leads with the Active group, then Resolved', async () => {
    const component = renderFilter(['IN_PROGRESS']);
    const listbox = await openFilter(component);
    const headers = rowsWithSlot(listbox, 'faceted-group-toggle');

    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent(PLAN_STATUS_FILTER_COPY.activeGroup);
    expect(headers[1]).toHaveTextContent(PLAN_STATUS_FILTER_COPY.resolvedGroup);
  });

  test('a group header selects the whole group', async () => {
    const onChange = vi.fn<(value: string[]) => void>();
    const component = renderFilter(['COMPLETED'], onChange);
    const listbox = await openFilter(component);
    const [activeHeader] = rowsWithSlot(listbox, 'faceted-group-toggle');
    if (!activeHeader) {
      throw new Error('Active group header missing');
    }

    await userEvent.click(activeHeader);

    expect(onChange).toHaveBeenCalledWith([
      'BACKLOG',
      'PENDING',
      'QUEUED',
      'IN_PROGRESS',
      'BLOCKED',
      'COMPLETED',
    ]);
  });

  test('toggling a row emits the next selection', async () => {
    const onChange = vi.fn<(value: string[]) => void>();
    const component = renderFilter(['IN_PROGRESS'], onChange);
    const listbox = await openFilter(component);

    await userEvent.click(
      within(listbox).getByRole('option', { name: planStatusValues.QUEUED }),
    );

    expect(onChange).toHaveBeenCalledWith(['QUEUED', 'IN_PROGRESS']);
  });

  describe('footer actions', () => {
    test('Reset emits the defaults', async () => {
      const onChange = vi.fn<(value: string[]) => void>();
      const component = renderFilter(['BLOCKED'], onChange);
      await openFilter(component);

      await userEvent.click(
        component.getByRole('button', {
          name: PLAN_STATUS_FILTER_COPY.resetToDefaults,
        }),
      );

      expect(onChange).toHaveBeenCalledWith([...DEFAULT_STATUSES]);
    });

    test('All statuses emits every status', async () => {
      const onChange = vi.fn<(value: string[]) => void>();
      const component = renderFilter(['BLOCKED'], onChange);
      await openFilter(component);

      await userEvent.click(
        component.getByRole('button', {
          name: PLAN_STATUS_FILTER_COPY.allStatuses,
        }),
      );

      expect(onChange).toHaveBeenCalledWith([...STATUS_OPTIONS]);
    });

    test('Reset is disabled when the defaults are selected', async () => {
      const component = renderFilter([...DEFAULT_STATUSES].reverse());
      await openFilter(component);

      expect(
        component.getByRole('button', {
          name: PLAN_STATUS_FILTER_COPY.resetToDefaults,
        }),
      ).toBeDisabled();
      expect(
        component.getByRole('button', {
          name: PLAN_STATUS_FILTER_COPY.allStatuses,
        }),
      ).toBeEnabled();
    });

    test('All statuses is disabled when every status is selected', async () => {
      const component = renderFilter([...STATUS_OPTIONS]);
      await openFilter(component);

      expect(
        component.getByRole('button', {
          name: PLAN_STATUS_FILTER_COPY.allStatuses,
        }),
      ).toBeDisabled();
    });
  });
});
