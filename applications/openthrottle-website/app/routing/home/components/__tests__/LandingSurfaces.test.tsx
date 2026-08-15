import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { LANDING_SURFACES } from '~/routing/home/data/data.landing';
import { LandingSurfaces } from '../LandingSurfaces';

describe('LandingSurfaces Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(<LandingSurfaces />);
  });

  test('renders every surface card from data', () => {
    expect(component.getByTestId('LandingSurfaces')).toBeInTheDocument();

    for (const card of LANDING_SURFACES.cards) {
      expect(component.getByText(card.title)).toBeInTheDocument();
      expect(component.getByText(card.body)).toBeInTheDocument();
    }
  });
});
