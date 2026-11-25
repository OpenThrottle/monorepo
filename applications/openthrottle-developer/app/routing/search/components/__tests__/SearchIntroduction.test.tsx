import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { SEARCH_INTRODUCTION_COPY } from '~/routing/search/data/copy';

import { SearchIntroduction } from '../SearchIntroduction';

describe('SearchIntroduction', () => {
  test('renders the page heading', () => {
    const component = render(<SearchIntroduction actions={null} />);

    expect(
      component.getByRole('heading', {
        level: 1,
        name: SEARCH_INTRODUCTION_COPY.title,
      }),
    ).toBeInTheDocument();
  });

  test('always renders the description', () => {
    const component = render(<SearchIntroduction actions={null} />);

    expect(
      component.getByTestId('SearchIntroduction-description'),
    ).toBeInTheDocument();
  });

  test('renders the actions slot beside the heading', () => {
    const component = render(
      <SearchIntroduction actions={<button type="button">Scope</button>} />,
    );

    const actions = component.getByTestId('SearchIntroduction-actions');

    expect(actions).toContainElement(
      component.getByRole('button', { name: 'Scope' }),
    );
  });

  describe('without actions', () => {
    test('owns no controls', () => {
      const component = render(<SearchIntroduction actions={null} />);

      expect(component.queryByRole('button')).toBeNull();
      expect(component.queryByRole('checkbox')).toBeNull();
    });
  });
});
