import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
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

  it('merges contentClassName onto the popover panel', async () => {
    const user = userEvent.setup();
    const component = render(
      <Combobox
        contentClassName="w-auto"
        options={options}
        placeholder="Select"
      />,
    );

    await user.click(component.getByRole('combobox'));

    await waitFor(() => {
      const panel = component.baseElement.querySelector(
        '[data-radix-popper-content-wrapper] > *',
      );
      expect(panel).toHaveClass('w-auto', 'p-0');
      expect(panel).not.toHaveClass('w-(--radix-popover-trigger-width)');
    });
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

  describe('when options carry a group', () => {
    const groupedOptions = [
      { group: 'Starred', label: 'Website', value: 'website' },
      { group: 'All projects', label: 'Admin', value: 'admin' },
      { group: 'Starred', label: 'Developer', value: 'developer' },
    ];

    const openGrouped = async (): Promise<HTMLElement> => {
      const user = userEvent.setup();
      const component = render(
        <Combobox
          options={[
            ...groupedOptions,
            {
              group: 'All projects',
              icon: <svg data-testid="ProjectIcon" />,
              label: 'Email',
              value: 'email',
            },
          ]}
        />,
      );
      await user.click(component.getByRole('combobox'));

      return component.findByRole('listbox');
    };

    it('lists groups in first-appearance order under their headings', async () => {
      const listbox = await openGrouped();
      const groups = listbox.querySelectorAll('[cmdk-group]');
      const headings = [...groups].map((group) => {
        return group.querySelector('[cmdk-group-heading]')?.textContent;
      });

      expect(headings).toEqual(['Starred', 'All projects']);
      expect(groups[0]).toHaveTextContent('WebsiteDeveloper');
      expect(listbox.querySelectorAll('[cmdk-separator]')).toHaveLength(1);
    });

    it('renders an option icon', async () => {
      const listbox = await openGrouped();

      expect(
        listbox.querySelector('[data-testid="ProjectIcon"]'),
      ).toBeInTheDocument();
    });

    it('hides a group with no match while searching', async () => {
      const user = userEvent.setup();
      const component = render(<Combobox options={groupedOptions} />);
      await user.click(component.getByRole('combobox'));
      const input = await component.findByRole('combobox', {
        name: (_name, element) => element.hasAttribute('cmdk-input'),
      });

      await user.type(input, 'Admin');

      await waitFor(() => {
        const visibleHeadings = [
          ...component.baseElement.querySelectorAll('[cmdk-group]'),
        ]
          .filter((group) => !group.hasAttribute('hidden'))
          .map((group) => {
            return group.querySelector('[cmdk-group-heading]')?.textContent;
          });
        expect(visibleHeadings).toEqual(['All projects']);
      });
    });
  });
});
