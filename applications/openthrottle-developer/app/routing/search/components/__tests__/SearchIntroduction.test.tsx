import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SEARCH_INTRODUCTION_COPY } from '~/routing/search/data/data.copy';

import { SearchIntroduction } from '../SearchIntroduction';

describe('SearchIntroduction', () => {
  test('renders the page heading', () => {
    const component = render(<SearchIntroduction hasQuery={false} />);

    expect(
      component.getByRole('heading', {
        level: 1,
        name: SEARCH_INTRODUCTION_COPY.title,
      }),
    ).toBeInTheDocument();
  });

  test('shows the first-visit hint only without a query', () => {
    const empty = render(<SearchIntroduction hasQuery={false} />);

    expect(empty.getByTestId('SearchIntroduction-hint')).toBeInTheDocument();
    empty.unmount();

    const withQuery = render(<SearchIntroduction hasQuery={true} />);

    expect(withQuery.queryByTestId('SearchIntroduction-hint')).toBeNull();
  });

  test('owns no controls', () => {
    const component = render(<SearchIntroduction hasQuery={true} />);

    expect(component.queryByRole('checkbox')).toBeNull();
    expect(component.queryByRole('switch')).toBeNull();
  });
});
