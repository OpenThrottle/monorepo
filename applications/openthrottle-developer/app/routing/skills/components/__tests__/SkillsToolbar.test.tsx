import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillsToolbar } from '../SkillsToolbar';

describe('SkillsToolbar Component', () => {
  test('renders search input with placeholder and search button', () => {
    const Component = () => <SkillsToolbar />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(
      screen.getByPlaceholderText('Filter by slug, path, or summary'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByTestId('SkillsToolbar')).toBeInTheDocument();
  });
});
