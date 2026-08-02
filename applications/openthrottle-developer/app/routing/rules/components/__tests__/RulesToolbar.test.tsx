import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { RULES_COPY } from '../../data/data.copy';
import { RulesToolbar } from '../RulesToolbar';
import type { RulesToolbarProps } from '../RulesToolbar';

function RulesToolbarWithQueryString(props: RulesToolbarProps) {
  const [searchParams] = useSearchParams();
  return (
    <>
      <RulesToolbar {...props} />
      <span data-testid="current-search">{searchParams.toString()}</span>
    </>
  );
}

function renderToolbar(
  initialEntry = '/',
  props: RulesToolbarProps = {},
): RenderResult {
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = () => <RulesToolbarWithQueryString {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub initialEntries={[initialEntry]} />);
}

describe('RulesToolbar Component', () => {
  let component: RenderResult;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    component = renderToolbar();
  });

  test('should have data-testid RulesToolbar', () => {
    expect(component.getByTestId('RulesToolbar')).toBeInTheDocument();
  });

  test('should render search form with role=search', () => {
    expect(component.getByRole('search')).toBeInTheDocument();
  });

  test('should render search input from RULES_COPY', () => {
    expect(
      component.getByRole('searchbox', { name: RULES_COPY.searchAriaLabel }),
    ).toBeInTheDocument();
    expect(
      component.getByPlaceholderText(RULES_COPY.searchPlaceholder),
    ).toBeInTheDocument();
  });

  test('should render search button from RULES_COPY', () => {
    expect(
      component.getByRole('button', { name: RULES_COPY.searchAction }),
    ).toBeInTheDocument();
  });

  test('should render New rule CTA linking to /rules/new', () => {
    expect(
      component.getByRole('link', { name: RULES_COPY.newRuleAction }),
    ).toHaveAttribute('href', '/rules/new');
  });

  test('should reflect q from initial search params in the search input', () => {
    cleanup();
    component = renderToolbar('/?q=hello');

    expect(
      component.getByRole('searchbox', { name: RULES_COPY.searchAriaLabel }),
    ).toHaveValue('hello');
  });

  test('updates URL q param on search submit', async () => {
    const user = userEvent.setup();
    const input = component.getByRole('searchbox', {
      name: RULES_COPY.searchAriaLabel,
    });

    await user.clear(input);
    await user.type(input, 'draft');
    await user.click(
      component.getByRole('button', { name: RULES_COPY.searchAction }),
    );

    await waitFor(() => {
      const qs = new URLSearchParams(
        component.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('q')).toBe('draft');
    });
  });

  test('removes q from URL when search is cleared on submit', async () => {
    cleanup();
    component = renderToolbar('/?q=old');
    const user = userEvent.setup();

    const input = component.getByRole('searchbox', {
      name: RULES_COPY.searchAriaLabel,
    });
    await user.clear(input);
    await user.click(
      component.getByRole('button', { name: RULES_COPY.searchAction }),
    );

    await waitFor(() => {
      const qs = new URLSearchParams(
        component.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.has('q')).toBe(false);
    });
  });

  describe('enabled filter (All / Enabled / Disabled)', () => {
    test('should render the three filter segments from RULES_COPY', () => {
      const group = component.getByTestId('RulesToolbar-enabled-filter');
      expect(group).toBeInTheDocument();
      expect(
        component.getByRole('radio', { name: RULES_COPY.filterAllLabel }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('radio', { name: RULES_COPY.filterEnabledLabel }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('radio', { name: RULES_COPY.filterDisabledLabel }),
      ).toBeInTheDocument();
    });

    test('should mark the active segment from the enabled URL param', () => {
      cleanup();
      component = renderToolbar('/?enabled=disabled');

      expect(
        component.getByRole('radio', { name: RULES_COPY.filterDisabledLabel }),
      ).toHaveAttribute('aria-checked', 'true');
      expect(
        component.getByRole('radio', { name: RULES_COPY.filterAllLabel }),
      ).toHaveAttribute('aria-checked', 'false');
    });

    test('should set enabled URL param when a filter segment is clicked', async () => {
      const user = userEvent.setup();

      await user.click(
        component.getByRole('radio', { name: RULES_COPY.filterEnabledLabel }),
      );

      await waitFor(() => {
        const qs = new URLSearchParams(
          component.getByTestId('current-search').textContent ?? '',
        );
        expect(qs.get('enabled')).toBe('enabled');
      });
    });

    test('should remove enabled URL param when All is selected', async () => {
      cleanup();
      component = renderToolbar('/?enabled=enabled');
      const user = userEvent.setup();

      await user.click(
        component.getByRole('radio', { name: RULES_COPY.filterAllLabel }),
      );

      await waitFor(() => {
        const qs = new URLSearchParams(
          component.getByTestId('current-search').textContent ?? '',
        );
        expect(qs.has('enabled')).toBe(false);
      });
    });

    test('re-clicking the active segment keeps the selection (no empty emit)', async () => {
      cleanup();
      component = renderToolbar('/?enabled=disabled');
      const user = userEvent.setup();

      await user.click(
        component.getByRole('radio', { name: RULES_COPY.filterDisabledLabel }),
      );

      await waitFor(() => {
        const qs = new URLSearchParams(
          component.getByTestId('current-search').textContent ?? '',
        );
        expect(qs.get('enabled')).toBe('disabled');
      });
    });
  });

  describe('when filters are active', () => {
    test('should show clear filters button when q is set', () => {
      cleanup();
      component = renderToolbar('/?q=needle');

      expect(
        component.getByRole('button', {
          name: RULES_COPY.clearFiltersAction,
        }),
      ).toBeInTheDocument();
    });

    test('should show clear filters button when enabled filter is set', () => {
      cleanup();
      component = renderToolbar('/?enabled=enabled');

      expect(
        component.getByRole('button', {
          name: RULES_COPY.clearFiltersAction,
        }),
      ).toBeInTheDocument();
    });

    test('should clear q and enabled params when clear filters is clicked', async () => {
      cleanup();
      component = renderToolbar('/?q=needle&enabled=disabled');
      const user = userEvent.setup();

      await user.click(
        component.getByRole('button', {
          name: RULES_COPY.clearFiltersAction,
        }),
      );

      await waitFor(() => {
        const qs = new URLSearchParams(
          component.getByTestId('current-search').textContent ?? '',
        );
        expect(qs.has('q')).toBe(false);
        expect(qs.has('enabled')).toBe(false);
      });
    });
  });

  describe('when no filters are active', () => {
    test('should not show clear filters button', () => {
      expect(
        component.queryByRole('button', {
          name: RULES_COPY.clearFiltersAction,
        }),
      ).not.toBeInTheDocument();
    });
  });
});
