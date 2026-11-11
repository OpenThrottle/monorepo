import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { MOCK_FRAGMENTS } from '../../data/mock.fragments';
import { CoreLogicRenderer } from '../CoreLogicRenderer';

describe('CoreLogicRenderer', () => {
  test('lists only the logic fragments', () => {
    const component = render(
      <CoreLogicRenderer className={undefined} fragments={MOCK_FRAGMENTS} />,
    );

    expect(
      component.getByRole('heading', { name: 'LogicParams' }),
    ).toBeInTheDocument();
    expect(component.getAllByRole('heading')).toHaveLength(1);
  });
});
