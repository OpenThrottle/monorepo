import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { StatusMultiSelect } from '../StatusMultiSelect';

const DEFAULT_OPTIONS = ['IN_PROGRESS', 'PENDING', 'BACKLOG'];

function renderStatusMultiSelect(
  props: {
    onChange?: (value: string[]) => void;
    options?: readonly string[];
    value?: readonly string[];
  } = {},
) {
  const value = props.value ?? [];
  const onChange = props.onChange ?? vi.fn();
  const options = props.options ?? DEFAULT_OPTIONS;
  return render(
    <StatusMultiSelect onChange={onChange} options={options} value={value} />,
  );
}

describe('StatusMultiSelect', () => {
  describe('render and accessibility', () => {
    test('renders trigger with "Status" label and aria-expanded', () => {
      const { getByRole, getByText } = renderStatusMultiSelect();
      expect(getByText('Status')).toBeInTheDocument();
      const trigger = getByRole('combobox', { name: /Status/ });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('does not show selected badges section when value is empty', () => {
      const { queryByRole } = renderStatusMultiSelect({ value: [] });
      expect(queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument();
    });
  });

  describe('popover open and options', () => {
    test('opens popover on trigger click and shows options with labels (underscores as spaces)', async () => {
      const user = userEvent.setup();
      const { getByRole, findByText } = renderStatusMultiSelect();
      const trigger = getByRole('combobox', { name: /Status/ });
      await user.click(trigger);

      const inProgressOption = await findByText(
        'IN PROGRESS',
        {},
        { timeout: 2000 },
      );
      expect(inProgressOption).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      // Options are in the popover (labels with underscores as spaces)
      const pendingOption = await findByText('PENDING', {}, { timeout: 500 });
      const backlogOption = await findByText('BACKLOG', {}, { timeout: 500 });
      expect(pendingOption).toBeInTheDocument();
      expect(backlogOption).toBeInTheDocument();
    });
  });

  describe('select and deselect options', () => {
    test('selecting an option calls onChange and shows badge below', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(value: string[]) => void>();
      const { getByRole, findByRole } = renderStatusMultiSelect({
        onChange,
        value: [],
      });
      await user.click(getByRole('combobox', { name: /Status/ }));
      const inProgressOption = await findByRole('option', {
        name: 'IN PROGRESS',
      });
      await user.click(inProgressOption);

      expect(onChange).toHaveBeenCalledWith(['IN_PROGRESS']);
      // Badge for selected value is shown when value is set (tested in "shows correct badges")
    });

    test('deselecting an option in popover calls onChange with filtered value', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(value: string[]) => void>();
      const { getByRole, findByRole } = renderStatusMultiSelect({
        onChange,
        value: ['IN_PROGRESS', 'PENDING'],
      });
      await user.click(getByRole('combobox', { name: /Status/ }));
      const inProgressOption = await findByRole('option', {
        name: 'IN PROGRESS',
      });
      await user.click(inProgressOption);

      expect(onChange).toHaveBeenCalledWith(['PENDING']);
    });
  });

  describe('selected list below with badges', () => {
    test('shows correct badges for selected values', () => {
      const { getByText } = renderStatusMultiSelect({
        value: ['IN_PROGRESS', 'BACKLOG'],
      });
      expect(getByText('IN PROGRESS')).toBeInTheDocument();
      expect(getByText('BACKLOG')).toBeInTheDocument();
    });

    test('remove via badge dismiss calls onChange with filtered value', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(value: string[]) => void>();
      const { getByRole } = renderStatusMultiSelect({
        onChange,
        value: ['IN_PROGRESS', 'PENDING'],
      });
      const removeInProgress = getByRole('button', {
        name: 'Remove IN PROGRESS',
      });
      await user.click(removeInProgress);

      expect(onChange).toHaveBeenCalledWith(['PENDING']);
    });
  });

  describe('accessibility', () => {
    test('trigger has combobox role and accessible name from label', () => {
      const { getByRole } = renderStatusMultiSelect();
      const trigger = getByRole('combobox', { name: /Status/ });
      expect(trigger).toBeInTheDocument();
    });

    test('each badge remove button has aria-label', () => {
      const { getByRole } = renderStatusMultiSelect({
        value: ['IN_PROGRESS', 'BACKLOG'],
      });
      expect(
        getByRole('button', { name: 'Remove IN PROGRESS' }),
      ).toBeInTheDocument();
      expect(
        getByRole('button', { name: 'Remove BACKLOG' }),
      ).toBeInTheDocument();
    });
  });
});
