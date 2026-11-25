import type { RenderResult } from '@testing-library/react';
import { render, within } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import { LANDING_ROADMAP } from '~/routing/home/data/landing';

import { LandingRoadmap } from '../LandingRoadmap';

describe('LandingRoadmap Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(<LandingRoadmap />);
  });

  test('renders one entry per public upcoming registry feature', () => {
    const list = component.getByRole('list');

    expect(LANDING_ROADMAP.items.length).toBeGreaterThan(0);
    expect(within(list).getAllByRole('listitem')).toHaveLength(
      LANDING_ROADMAP.items.length,
    );

    for (const item of LANDING_ROADMAP.items) {
      expect(
        component.getByRole('heading', { name: item.name }),
      ).toBeInTheDocument();
    }
  });

  test('lists only in-flight and planned entries', () => {
    const landed = LANDING_ROADMAP.items.filter((item) => {
      return item.status !== 'in-flight' && item.status !== 'planned';
    });

    expect(landed).toEqual([]);
  });
});
