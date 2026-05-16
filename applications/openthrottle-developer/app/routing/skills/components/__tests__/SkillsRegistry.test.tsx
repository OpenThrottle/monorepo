import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillsRegistry } from '../SkillsRegistry';

describe('SkillsRegistry Component', () => {
  test('renders registry shell', () => {
    const Component = () => <SkillsRegistry />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('SkillsRegistry')).toBeInTheDocument();
  });
});
