import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { LOGIC_COOKIES_COPY } from '../../data/data.copy';
import { LogicCookies } from '../LogicCookies';

describe('LogicCookies', () => {
  describe('with children', () => {
    test('renders them', () => {
      const component = render(
        <LogicCookies cookies={{}}>
          <p>child</p>
        </LogicCookies>,
      );

      expect(component.getByText('child')).toBeInTheDocument();
    });
  });

  describe('without children', () => {
    test('renders the empty state', () => {
      const component = render(
        <LogicCookies cookies={{}}>{null}</LogicCookies>,
      );

      expect(
        component.getByText(LOGIC_COOKIES_COPY.emptyTitle),
      ).toBeInTheDocument();
    });
  });
});
