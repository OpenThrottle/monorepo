import * as React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../faq._index';
import { buildRootMatch } from '~/testing/root-match-fixture';
import { buildPersistentSettingKey } from '~/global/config/persistent-setting-storage';
import { DOCS_FEATURE_FLAG_DEFAULTS } from '~/global/config/docs-feature-flags';
import type { Route } from '@/app/routes/+types/faq._index';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/faq._index',
    loaderData: {},
    params: {},
    pathname: '/',
  },
];

const renderFaq = () =>
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

describe('routes/faq._index.tsx', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renders the FAQ heading and questions from docs-content', () => {
    const view = renderFaq();

    expect(
      view.getByRole('heading', { level: 1, name: 'FAQ' }),
    ).toBeInTheDocument();
    expect(
      view.getByRole('button', { name: 'What is OpenThrottle?' }),
    ).toBeInTheDocument();
  });

  test('renders the search trigger when the search flag is on (default)', () => {
    const view = renderFaq();

    expect(
      view.getByRole('button', { name: 'Search FAQ…' }),
    ).toBeInTheDocument();
  });

  test('hides the search trigger when the search flag is off', () => {
    window.localStorage.setItem(
      buildPersistentSettingKey('docs.featureFlags'),
      JSON.stringify({ ...DOCS_FEATURE_FLAG_DEFAULTS, search: false }),
    );

    const view = renderFaq();

    expect(
      view.queryByRole('button', { name: 'Search FAQ…' }),
    ).not.toBeInTheDocument();
  });

  test('never renders placeholder Lorem ipsum copy', () => {
    const view = renderFaq();

    expect(view.queryByText(/lorem ipsum/i)).not.toBeInTheDocument();
  });

  test('renders the category hero when the landing flag is on (default)', () => {
    const view = renderFaq();

    expect(view.getByTestId('FaqHero')).toBeInTheDocument();
  });

  test('falls back to a plain intro (no hero) when the landing flag is off', () => {
    window.localStorage.setItem(
      buildPersistentSettingKey('docs.featureFlags'),
      JSON.stringify({ ...DOCS_FEATURE_FLAG_DEFAULTS, landing: false }),
    );

    const view = renderFaq();

    expect(view.queryByTestId('FaqHero')).not.toBeInTheDocument();
    expect(view.getByText(/Answers to common questions/i)).toBeInTheDocument();
  });
});
