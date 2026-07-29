import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { buildPersistentSettingKey } from '~/global/config/persistent-setting-storage';
import { DOCS_FEATURE_FLAG_DEFAULTS } from '~/global/config/docs-feature-flags';
import Component from '../docs';
import type { Route } from '@/app/routes/+types/docs';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/docs',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

const renderDocs = () =>
  render(
    <MemoryRouter>
      <Component
        actionData={undefined}
        loaderData={{}}
        matches={matches}
        params={{}}
      />
    </MemoryRouter>,
  );

describe('routes/docs.tsx', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renders the docs sidebar nav from docs-content', () => {
    const view = renderDocs();

    expect(
      view.getByRole('navigation', { name: 'Documentation' }),
    ).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Getting Started' })).toHaveAttribute(
      'href',
      '/docs/getting-started',
    );
  });

  test('renders the search trigger when the search flag is on (default)', () => {
    const view = renderDocs();

    expect(
      view.getByRole('button', { name: 'Search docs…' }),
    ).toBeInTheDocument();
  });

  test('hides the search trigger when the search flag is off', () => {
    window.localStorage.setItem(
      buildPersistentSettingKey('docs.featureFlags'),
      JSON.stringify({ ...DOCS_FEATURE_FLAG_DEFAULTS, search: false }),
    );

    const view = renderDocs();

    expect(
      view.queryByRole('button', { name: 'Search docs…' }),
    ).not.toBeInTheDocument();
  });
});
