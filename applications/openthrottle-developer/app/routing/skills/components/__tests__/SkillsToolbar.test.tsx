import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { renderRoutesStub } from '../../../../testing/route-fixtures';
import { SkillsToolbar } from '../SkillsToolbar';

describe('SkillsToolbar Component', () => {
  test('renders search input with placeholder and search button', () => {
    renderRoutesStub(<SkillsToolbar />);

    expect(
      screen.getByPlaceholderText('Filter by slug, path, or summary'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByTestId('SkillsToolbar')).toBeInTheDocument();
  });
});
