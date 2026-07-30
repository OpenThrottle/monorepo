import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { buildPersistentSettingKey } from '~/global/config/persistent-setting-storage';
import { DOCS_FEATURE_FLAG_DEFAULTS } from '~/global/config/docs-feature-flags';
import Component from '../docs._index';
import type { Route } from '@/app/routes/+types/docs._index';

const matches: Route.ComponentProps['matches'] = [
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

const renderIndex = () =>
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

describe('routes/docs._index.tsx', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renders the card landing overview when the landing flag is on (default)', () => {
    const view = renderIndex();

    // The landing renders the index.md intro heading plus the group cards.
    expect(
      view.getByRole('heading', { level: 1, name: 'Documentation' }),
    ).toBeInTheDocument();
    expect(view.getByTestId('DocsLanding')).toBeInTheDocument();
  });

  test('falls back to the plain index page when the landing flag is off', () => {
    window.localStorage.setItem(
      buildPersistentSettingKey('docs.featureFlags'),
      JSON.stringify({ ...DOCS_FEATURE_FLAG_DEFAULTS, landing: false }),
    );

    const view = renderIndex();

    expect(
      view.getByRole('heading', { level: 1, name: 'Documentation' }),
    ).toBeInTheDocument();
    expect(view.queryByTestId('DocsLanding')).not.toBeInTheDocument();
  });
});
