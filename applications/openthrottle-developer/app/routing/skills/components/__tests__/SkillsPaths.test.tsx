import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillsPaths } from '../SkillsPaths';

describe('SkillsPaths Component', () => {
  test('renders paths shell', () => {
    const Component = () => <SkillsPaths />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('SkillsPaths')).toBeInTheDocument();
  });
});
