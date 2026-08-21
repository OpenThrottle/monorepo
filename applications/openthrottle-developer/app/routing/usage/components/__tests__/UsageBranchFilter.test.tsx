import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useLocation } from 'react-router';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { UsageBranchFilter } from '../UsageBranchFilter';
import type { UsageBranchFilterProps } from '../UsageBranchFilter';
import { BRANCH_FILTER_COPY } from '../../data/branch-filter-copy';
import { SKILL_USAGE_SCOPES } from '../../data/skill-usage-copy';

const BRANCH_OPTIONS = [
  { branch: 'main', count: 12 },
  { branch: 'feat/usage-branch-filter', count: 3 },
];

const baseProps = (): UsageBranchFilterProps => ({
  end: '2026-07-31',
  hasMore: false,
  initialOptions: BRANCH_OPTIONS,
  providerParam: null,
  selectedCwd: null,
  selectedGitBranch: null,
  selectedScope: null,
  start: '2026-07-01',
});

interface Rendered {
  readonly component: RenderResult;
  readonly location: { current: string };
  readonly searchCalls: string[];
}

const renderComponent = (props: UsageBranchFilterProps): Rendered => {
  const location = { current: '' };
  const searchCalls: string[] = [];

  const Component = (): React.ReactElement => {
    const current = useLocation();
    location.current = `${current.pathname}${current.search}`;

    return <UsageBranchFilter {...props} />;
  };

  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    {
      loader: ({ request }) => {
        const url = new URL(request.url);
        searchCalls.push(url.search);

        return {
          hasMore: false,
          items: [{ branch: 'release/4.8', count: 1 }],
          query: url.searchParams.get('query') ?? '',
        };
      },
      path: '/resources/usage-branches',
    },
  ]);

  return { component: render(<RoutesStub />), location, searchCalls };
};

/** Open the popover and return its listbox. */
const openListbox = async (rendered: Rendered): Promise<HTMLElement> => {
  const user = userEvent.setup();
  await user.click(rendered.component.getByRole('combobox'));

  return waitFor(() => {
    const listbox =
      rendered.component.baseElement.querySelector<HTMLElement>(
        '[role="listbox"]',
      );
    if (!listbox) throw new Error('Expected the listbox to be open');

    return listbox;
  });
};

describe('UsageBranchFilter Component', () => {
  test('lists All branches first, then the server order, with counts', async () => {
    const rendered = renderComponent(baseProps());
    const listbox = await openListbox(rendered);
    const labels = Array.from(listbox.querySelectorAll('[cmdk-item]')).map(
      (item) => item.textContent ?? '',
    );

    expect(labels[0]).toContain(BRANCH_FILTER_COPY.all);
    expect(labels[1]).toContain('main');
    expect(labels[1]).toContain('12');
    expect(labels[2]).toContain('feat/usage-branch-filter');
  });

  test('shows the selected branch on the trigger', () => {
    const rendered = renderComponent({
      ...baseProps(),
      selectedGitBranch: 'main',
    });

    expect(rendered.component.getByRole('combobox')).toHaveTextContent('main');
  });

  describe('when a branch is selected', () => {
    test('navigates preserving provider, skillScope, and skillCwd', async () => {
      const user = userEvent.setup();
      const rendered = renderComponent({
        ...baseProps(),
        providerParam: 'claude',
        selectedCwd: '/Users/matt/openthrottle',
        selectedScope: SKILL_USAGE_SCOPES.THIRD_PARTY,
      });
      const listbox = await openListbox(rendered);

      await user.click(rendered.component.getByText('main'));

      await waitFor(() => {
        expect(rendered.location.current).toContain('skillBranch=main');
      });
      expect(rendered.location.current).toContain('provider=claude');
      expect(rendered.location.current).toContain('skillScope=third-party');
      expect(rendered.location.current).toContain('skillCwd=');
      expect(listbox).toBeDefined();
    });
  });

  describe('when All branches is selected', () => {
    test('clears skillBranch but keeps the sibling params', async () => {
      const user = userEvent.setup();
      const rendered = renderComponent({
        ...baseProps(),
        providerParam: 'claude',
        selectedGitBranch: 'main',
      });
      await openListbox(rendered);

      await user.click(rendered.component.getByText(BRANCH_FILTER_COPY.all));

      await waitFor(() => {
        expect(rendered.location.current).not.toContain('skillBranch');
      });
      expect(rendered.location.current).toContain('provider=claude');
    });
  });

  describe('when the user types', () => {
    test('searches the server instead of filtering locally', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      try {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const rendered = renderComponent(baseProps());
        await openListbox(rendered);
        const input =
          rendered.component.baseElement.querySelector('input[cmdk-input]');
        if (!input) throw new Error('Expected the search input to be present');

        await user.type(input, 'release');
        await vi.advanceTimersByTimeAsync(300);

        await waitFor(() => {
          expect(rendered.searchCalls).toHaveLength(1);
        });
        expect(rendered.searchCalls[0]).toContain('query=release');
        await waitFor(() => {
          expect(
            rendered.component.baseElement.querySelector('[role="listbox"]')
              ?.textContent,
          ).toContain('release/4.8');
        });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('when a branch is selected that the current list omits', () => {
    test('still offers it so the filter can always be cleared', async () => {
      const rendered = renderComponent({
        ...baseProps(),
        initialOptions: [],
        selectedGitBranch: 'gone-from-window',
      });
      const listbox = await openListbox(rendered);

      expect(listbox.textContent).toContain('gone-from-window');
      expect(listbox.textContent).toContain(BRANCH_FILTER_COPY.all);
    });
  });
});
