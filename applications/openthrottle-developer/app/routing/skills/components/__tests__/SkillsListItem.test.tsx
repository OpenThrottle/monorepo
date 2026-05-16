import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillsListItem } from '../SkillsListItem';

describe('SkillsListItem Component', () => {
  test('renders list item shell', () => {
    const Component = () => <SkillsListItem />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('SkillsListItem')).toBeInTheDocument();
  });
});
