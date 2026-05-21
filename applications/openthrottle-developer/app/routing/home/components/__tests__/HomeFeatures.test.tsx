import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeFeatures } from '../HomeFeatures';
import type { HomeFeaturesProps } from '../HomeFeatures';
import { HOME_FEATURES } from '~/routing/home/data';

describe('HomeFeatures Component', () => {
  let props: HomeFeaturesProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeFeatures {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render feature cards from HOME_FEATURES', () => {
    expect(screen.getByTestId('HomeFeatures')).toBeInTheDocument();

    for (const feature of HOME_FEATURES) {
      expect(screen.getByText(feature.title)).toBeInTheDocument();
      expect(screen.getByText(feature.description)).toBeInTheDocument();
    }
  });
});
