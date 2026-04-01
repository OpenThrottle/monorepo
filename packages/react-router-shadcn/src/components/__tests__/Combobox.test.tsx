import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Combobox } from '../Combobox';

const options = ['Next.js', 'Remix', 'Astro'];

describe('Combobox', () => {
  it('renders trigger button with placeholder when no value', () => {
    const { container } = render(
      <Combobox options={options} placeholder="Select framework" />,
    );
    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Select framework');
  });

  it('renders trigger with selected value when value is set', () => {
    const { container } = render(<Combobox options={options} value="Remix" />);
    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).toHaveTextContent('Remix');
  });

  it('opens popover when trigger is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Combobox options={options} placeholder="Select" />,
    );
    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).toBeInTheDocument();
    await user.click(trigger as HTMLButtonElement);
    const listbox = container.ownerDocument.querySelector('[role="listbox"]');
    expect(listbox).toBeInTheDocument();
  });

  it('accepts options as string array', () => {
    const { container } = render(<Combobox options={['A', 'B']} value="A" />);
    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).toHaveTextContent('A');
  });

  it('accepts options as object array with label and value', () => {
    const { container } = render(
      <Combobox
        options={[
          { label: 'Next.js', value: 'next' },
          { label: 'Remix', value: 'remix' },
        ]}
        value="next"
      />,
    );
    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).toHaveTextContent('Next.js');
  });
});
