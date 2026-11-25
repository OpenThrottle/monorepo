import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import { LANDING_FEATURES } from '~/routing/home/data/landing';

import { LandingFeatures } from '../LandingFeatures';

describe('LandingFeatures Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(<LandingFeatures />);
  });

  test('renders every public landed feature from the registry', () => {
    expect(component.getByTestId('LandingFeatures')).toBeInTheDocument();

    for (const card of LANDING_FEATURES.cards) {
      expect(component.getByText(card.title)).toBeInTheDocument();
      expect(component.getByText(card.body)).toBeInTheDocument();
    }
  });

  test('marks preview features with a badge', () => {
    const previews = LANDING_FEATURES.cards.filter((card) => {
      return card.isPreview;
    });

    expect(
      component.queryAllByText(LANDING_FEATURES.previewLabel),
    ).toHaveLength(previews.length);
  });
});
