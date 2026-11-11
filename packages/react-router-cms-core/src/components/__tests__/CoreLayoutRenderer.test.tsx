import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { MOCK_FRAGMENTS } from '../../data/mock.fragments';
import { CoreLayoutRenderer } from '../CoreLayoutRenderer';

describe('CoreLayoutRenderer', () => {
  test('labels every fragment, unknown ones included', () => {
    const component = render(
      <CoreLayoutRenderer className={undefined} fragments={MOCK_FRAGMENTS} />,
    );

    expect(component.getByText('LayoutGrid')).toBeInTheDocument();
    expect(component.getByText('LogicParams')).toBeInTheDocument();
    expect(component.getAllByText('Heading')).toHaveLength(2);
    expect(component.getByText('NotARealBlock')).toBeInTheDocument();
  });
});
