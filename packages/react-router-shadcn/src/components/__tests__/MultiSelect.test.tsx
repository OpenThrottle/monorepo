import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MultiSelect } from '../MultiSelect';

const OPTIONS: readonly { label: string; value: string }[] = [
  { label: 'Alpha', value: 'alpha' },
  { label: 'Beta', value: 'beta' },
  { label: 'Gamma', value: 'gamma' },
];

describe('MultiSelect', () => {
  it('renders with placeholder when no value selected', () => {
    const { getByRole } = render(
      <MultiSelect
        onChange={() => {}}
        options={OPTIONS}
        placeholder="Select statuses"
        value={[]}
      />,
    );
    const trigger = getByRole('button', { name: 'Select statuses' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Select statuses');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens dropdown on trigger click and shows options', async () => {
    const user = userEvent.setup();
    const { getByRole, findAllByRole } = render(
      <MultiSelect
        onChange={() => {}}
        options={OPTIONS}
        placeholder="Select"
        value={[]}
      />,
    );
    const trigger = getByRole('button', { name: 'Select' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const options = await findAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Alpha');
    expect(options[1]).toHaveTextContent('Beta');
    expect(options[2]).toHaveTextContent('Gamma');
  });

  it('calls onChange with added value when option clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { getByRole, findByRole } = render(
      <MultiSelect
        onChange={onChange}
        options={OPTIONS}
        placeholder="Select"
        value={[]}
      />,
    );
    await user.click(getByRole('button', { name: 'Select' }));
    const optionAlpha = await findByRole('option', { name: 'Alpha' });
    await user.click(optionAlpha);
    expect(onChange).toHaveBeenCalledWith(['alpha']);
  });

  it('shows selected values as badges in trigger', () => {
    const { getByRole } = render(
      <MultiSelect
        onChange={() => {}}
        options={OPTIONS}
        placeholder="Select"
        value={['alpha', 'gamma']}
      />,
    );
    const trigger = getByRole('button', { name: 'Select' });
    expect(trigger).toBeInTheDocument();
    const badges = trigger.querySelectorAll('[data-slot="badge"]');
    expect(badges).toHaveLength(2);
    expect(trigger).toHaveTextContent('Alpha');
    expect(trigger).toHaveTextContent('Gamma');
  });

  it('calls onChange with removed value when selected option clicked again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { getByRole, findByRole } = render(
      <MultiSelect
        onChange={onChange}
        options={OPTIONS}
        placeholder="Select"
        value={['alpha', 'beta']}
      />,
    );
    await user.click(getByRole('button', { name: 'Select' }));
    const alphaOption = await findByRole('option', { name: 'Alpha' });
    await user.click(alphaOption);
    expect(onChange).toHaveBeenCalledWith(['beta']);
  });

  it('renders an option adornment and hint without making them selectable state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { getByRole, findByRole, getByTestId } = render(
      <MultiSelect
        onChange={onChange}
        options={[
          {
            adornment: <span data-testid="alpha-adornment">•</span>,
            hint: 'not detected',
            label: 'Alpha',
            value: 'alpha',
          },
          { label: 'Beta', value: 'beta' },
        ]}
        placeholder="Select"
        value={[]}
      />,
    );
    await user.click(getByRole('button', { name: 'Select' }));

    expect(getByTestId('alpha-adornment')).toBeInTheDocument();

    // An adorned/hinted option stays as selectable as a bare one.
    const alphaOption = await findByRole('option', { name: /Alpha/ });
    await user.click(alphaOption);
    expect(onChange).toHaveBeenCalledWith(['alpha']);
  });

  it('keeps the hint out of the search key, so a shared status word cannot match every option', async () => {
    const user = userEvent.setup();
    const { getByRole, findAllByRole, getByPlaceholderText } = render(
      <MultiSelect
        onChange={() => {}}
        options={[
          { hint: 'not detected', label: 'Alpha', value: 'alpha' },
          { hint: 'not detected', label: 'Beta', value: 'beta' },
        ]}
        placeholder="Select"
        searchPlaceholder="Search…"
        value={[]}
      />,
    );
    await user.click(getByRole('button', { name: 'Select' }));
    await user.type(getByPlaceholderText('Search…'), 'Alpha');

    const options = await findAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Alpha');
  });

  it('carries the adornment into the trigger tag for a selected option', () => {
    const { getByTestId } = render(
      <MultiSelect
        onChange={() => {}}
        options={[
          {
            adornment: <span data-testid="alpha-adornment">•</span>,
            label: 'Alpha',
            value: 'alpha',
          },
        ]}
        placeholder="Select"
        value={['alpha']}
      />,
    );

    expect(getByTestId('alpha-adornment')).toBeInTheDocument();
  });

  it('supports keyboard navigation and selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { getByRole } = render(
      <MultiSelect
        onChange={onChange}
        options={OPTIONS}
        placeholder="Select"
        value={[]}
      />,
    );
    await user.click(getByRole('button', { name: 'Select' }));
    // Focus lands on the search input inside the Command; arrow + Enter select.
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(['beta']);
  });
});
