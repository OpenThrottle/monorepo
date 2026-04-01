import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MultiSelect } from '../MultiSelect';

const OPTIONS: readonly { value: string; label: string }[] = [
  { label: 'Alpha', value: 'alpha' },
  { label: 'Beta', value: 'beta' },
  { label: 'Gamma', value: 'gamma' },
];

describe('MultiSelect', () => {
  it('renders with placeholder when no value selected', () => {
    const { container } = render(
      <MultiSelect
        onChange={() => {}}
        options={OPTIONS}
        placeholder="Select statuses"
        value={[]}
      />,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Select statuses');
  });

  it('opens dropdown on trigger click and shows options', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MultiSelect onChange={() => {}} options={OPTIONS} value={[]} />,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    await user.click(trigger as HTMLButtonElement);
    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox).toBeInTheDocument();
    const options = container.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Alpha');
    expect(options[1]).toHaveTextContent('Beta');
    expect(options[2]).toHaveTextContent('Gamma');
  });

  it('calls onChange with added value when option clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <MultiSelect onChange={onChange} options={OPTIONS} value={[]} />,
    );
    const trigger = container.querySelector('button');
    await user.click(trigger as HTMLButtonElement);
    const optionBeta = container.querySelector('[role="option"]');
    expect(optionBeta).toHaveTextContent('Alpha');
    await user.click(optionBeta as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(['alpha']);
  });

  it('shows selected values as badges in trigger', () => {
    const { container } = render(
      <MultiSelect
        onChange={() => {}}
        options={OPTIONS}
        value={['alpha', 'gamma']}
      />,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    const badges = container.querySelectorAll('[class*="inline-flex"]');
    expect(badges.length).toBeGreaterThanOrEqual(2);
    expect(trigger).toHaveTextContent('Alpha');
    expect(trigger).toHaveTextContent('Gamma');
  });

  it('calls onChange with removed value when selected option clicked again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <MultiSelect
        onChange={onChange}
        options={OPTIONS}
        value={['alpha', 'beta']}
      />,
    );
    const trigger = container.querySelector('button');
    await user.click(trigger as HTMLButtonElement);
    const options = container.querySelectorAll('[role="option"]');
    const alphaOption = Array.from(options).find((el) =>
      el.textContent?.includes('Alpha'),
    );
    await user.click(alphaOption as HTMLElement);
    expect(onChange).toHaveBeenCalledWith(['beta']);
  });
});
