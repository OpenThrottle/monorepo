import * as React from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import DocsIndex from '../docs._index';
import DocsSplat from '../docs.$';
import FaqIndex from '../faq._index';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { buildPersistentSettingKey } from '~/global/config/persistent-setting-storage';
import type { Route as DocsIndexRoute } from '@/app/routes/+types/docs._index';
import type { Route as FaqRoute } from '@/app/routes/+types/faq._index';

const ALL_OFF = {
  codeCopy: false,
  landing: false,
  prevNext: false,
  search: false,
  toc: false,
};

const docsIndexMatches: DocsIndexRoute.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/docs',
    loaderData: {},
    params: {},
    pathname: '/',
  },
  {
    handle: undefined,
    id: 'routes/docs._index',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

const faqMatches: FaqRoute.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/faq._index',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

function splatMatches(): React.ComponentProps<typeof DocsSplat>['matches'];
function splatMatches(): unknown {
  return [];
}

const setFlags = (flags: Record<string, boolean>): void => {
  window.localStorage.setItem(
    buildPersistentSettingKey('docs.featureFlags'),
    JSON.stringify(flags),
  );
};

afterEach(() => {
  window.localStorage.clear();
});

describe('docs/FAQ SSR safety (default flags)', () => {
  test('the docs index landing content is present in server-rendered HTML', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DocsIndex
          actionData={undefined}
          loaderData={{}}
          matches={docsIndexMatches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('OpenThrottle developer documentation');
    expect(html).toContain('Concepts');
  });

  test('the FAQ content is server-rendered with no placeholder', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <FaqIndex
          actionData={undefined}
          loaderData={{}}
          matches={faqMatches}
          params={{}}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('What is OpenThrottle?');
    expect(html).toContain('Browse by category');
    expect(html.toLowerCase()).not.toContain('lorem ipsum');
  });
});

describe('docs/FAQ render across flag extremes', () => {
  test('a docs page renders with every upgrade off (baseline)', () => {
    setFlags(ALL_OFF);

    const view = render(
      <MemoryRouter>
        <DocsSplat
          actionData={undefined}
          loaderData={{ title: 'Getting Started' }}
          matches={splatMatches()}
          params={{ '*': 'getting-started' }}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'Getting Started' }),
    ).toBeInTheDocument();
    // Every gated affordance is absent in the all-off baseline.
    expect(view.queryByTestId('DocPageToc')).not.toBeInTheDocument();
    expect(view.queryByTestId('DocPagePager')).not.toBeInTheDocument();
    expect(
      view.queryByRole('button', { name: 'Copy code' }),
    ).not.toBeInTheDocument();
  });

  test('a docs page renders with every upgrade on', () => {
    // localStorage empty -> defaults (all on).
    const view = render(
      <MemoryRouter>
        <DocsSplat
          actionData={undefined}
          loaderData={{ title: 'Getting Started' }}
          matches={splatMatches()}
          params={{ '*': 'getting-started' }}
        />
      </MemoryRouter>,
    );

    expect(
      view.getByRole('heading', { level: 1, name: 'Getting Started' }),
    ).toBeInTheDocument();
    expect(view.getByTestId('DocPagePager')).toBeInTheDocument();
  });
});
