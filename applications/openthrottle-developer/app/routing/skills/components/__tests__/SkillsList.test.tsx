import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillsList } from '../SkillsList';

describe('SkillsList Component', () => {
  test('renders list shell and a list item', () => {
    const Component = () => <SkillsList />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('SkillsList')).toBeInTheDocument();
    expect(screen.getByTestId('SkillsListItem')).toBeInTheDocument();
  });
});
