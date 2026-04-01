import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeFeatures } from '../HomeFeatures';
import type { HomeFeaturesProps } from '../HomeFeatures';
import { HOME_FEATURES, HOME_FEATURES_DOC_URL } from '~/routing/home/data';

describe('HomeFeatures Component', () => {
  let props: HomeFeaturesProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeFeatures {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render section with heading, doc link, and feature cards', () => {
    expect(screen.getByTestId('HomeFeatures')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Features' }),
    ).toBeInTheDocument();

    const docLink = screen.getByRole('link', {
      name: /docs\/openthrottle\/features\.md/,
    });
    expect(docLink).toHaveAttribute('href', HOME_FEATURES_DOC_URL);
    expect(docLink).toHaveAttribute('target', '_blank');
    expect(docLink).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.getAllByRole('listitem')).toHaveLength(HOME_FEATURES.length);
    expect(screen.getByText('Plans and tasks')).toBeInTheDocument();
    expect(screen.getByText('Semantic search')).toBeInTheDocument();
  });
});
