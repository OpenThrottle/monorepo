import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
    if (!trigger) throw new Error('Expected combobox trigger to be present');
    await user.click(trigger);
    await waitFor(() => {
      expect(
        container.ownerDocument.querySelector('[role="listbox"]'),
      ).toBeInTheDocument();
    });
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
  describe('async search mode', () => {
    /** Open the popover and hand back the owning document. */
    const openCombobox = async (container: HTMLElement): Promise<Document> => {
      const user = userEvent.setup();
      const trigger = container.querySelector('button[role="combobox"]');
      if (!trigger) throw new Error('Expected combobox trigger to be present');
      await user.click(trigger);
      await waitFor(() => {
        expect(
          container.ownerDocument.querySelector('[role="listbox"]'),
        ).toBeInTheDocument();
      });

      return container.ownerDocument;
    };

    it('reports each keystroke through onSearchChange', async () => {
      const user = userEvent.setup();
      const onSearchChange = vi.fn();
      const { container } = render(
        <Combobox
          onSearchChange={onSearchChange}
          options={options}
          searchValue=""
          shouldFilter={false}
        />,
      );
      const document = await openCombobox(container);
      const input = document.querySelector('input[cmdk-input]');
      if (!input) throw new Error('Expected the search input to be present');

      await user.type(input, 'Re');

      expect(onSearchChange).toHaveBeenCalledWith('R');
    });

    it('renders every provided option verbatim when shouldFilter is false', async () => {
      const { container } = render(
        <Combobox
          onSearchChange={vi.fn()}
          options={options}
          searchValue="zzz-matches-nothing"
          shouldFilter={false}
        />,
      );
      const document = await openCombobox(container);
      const listbox = document.querySelector('[role="listbox"]');

      for (const option of options) {
        expect(listbox).toHaveTextContent(option);
      }
    });

    describe('when a search is in flight', () => {
      it('shows the loading row instead of the empty state', async () => {
        const { container } = render(
          <Combobox
            loading={true}
            options={[]}
            searchValue="re"
            shouldFilter={false}
          />,
        );
        const document = await openCombobox(container);
        const listbox = document.querySelector('[role="listbox"]');

        expect(listbox).toHaveTextContent('Loading…');
        expect(listbox).not.toHaveTextContent('No results found.');
      });
    });

    it('renders a footer under the list', async () => {
      const { container } = render(
        <Combobox
          footer={<div>keep typing to narrow</div>}
          options={options}
          shouldFilter={false}
        />,
      );
      const document = await openCombobox(container);

      expect(document.querySelector('[cmdk-root]')?.textContent).toContain(
        'keep typing to narrow',
      );
    });

    it('renders an option hint as trailing text', async () => {
      const { container } = render(
        <Combobox options={[{ hint: '412', label: 'main', value: 'main' }]} />,
      );
      const document = await openCombobox(container);

      expect(document.querySelector('[role="listbox"]')).toHaveTextContent(
        '412',
      );
    });
  });
});
