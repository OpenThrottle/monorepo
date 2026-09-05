import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { TimelineLaneGrouping } from '~/__generated__/graphql';
import {
  FIXTURE_WINDOW_FROM,
  FIXTURE_WINDOW_TO,
  TIMELINE_FIXTURE_MARKERS,
  TIMELINE_FIXTURE_SPANS,
} from '~/routing/timeline/data/data.fixtures';
import { TIMELINE_PAGE_COPY } from '~/routing/timeline/data/data.copy';
import { buildRootMatch } from '~/testing/root-match-fixture';
import type { Route } from '@/app/routes/+types/timeline._index';
import Component, { shouldRevalidate } from '../timeline._index';

// The fixtures are readonly; the generated loader-data type is not, so they are
// copied rather than aliased.
const loaderData = {
  grouping: TimelineLaneGrouping.ByPlan,
  markers: [...TIMELINE_FIXTURE_MARKERS],
  selectedBranch: null,
  selectedMarkerKinds: null,
  selectedSpanKinds: null,
  spans: [...TIMELINE_FIXTURE_SPANS],
  truncation: [],
  windowFromIso: FIXTURE_WINDOW_FROM.toISOString(),
  windowPreset: '7d' as const,
  windowToIso: FIXTURE_WINDOW_TO.toISOString(),
};

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/timeline._index',
    loaderData,
    params: {},
    pathname: '/timeline',
  },
];

describe('routes/timeline._index.tsx', () => {
  test('renders page heading', () => {
    const view = render(
      <MemoryRouter>
        <Component
          actionData={undefined}
          loaderData={loaderData}
          matches={matches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { name: TIMELINE_PAGE_COPY.title }),
    ).toBeInTheDocument();
  });

  describe('shouldRevalidate', () => {
    const call = (currentSearch: string, nextSearch: string): boolean =>
      shouldRevalidate({
        actionResult: undefined,
        actionStatus: undefined,
        currentParams: {},
        currentUrl: new URL(`https://x.test/timeline${currentSearch}`),
        defaultShouldRevalidate: true,
        formAction: undefined,
        formData: undefined,
        formEncType: undefined,
        formMethod: undefined,
        json: undefined,
        nextParams: {},
        nextUrl: new URL(`https://x.test/timeline${nextSearch}`),
        text: undefined,
      });

    test('revalidates when a param the loader reads changes', () => {
      expect(call('?window=7d', '?window=30d')).toBe(true);
    });

    test('does not revalidate for a param the loader ignores', () => {
      // The chart writes hover/selection state; refetching the whole window on
      // every hover is the failure this guard exists to prevent.
      expect(call('?window=7d', '?window=7d&hovered=run-a')).toBe(false);
    });

    test('does not revalidate when nothing changed', () => {
      expect(call('?window=7d', '?window=7d')).toBe(false);
    });
  });
});
