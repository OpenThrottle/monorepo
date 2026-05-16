import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillCard } from '../SkillCard';

describe('SkillCard Component', () => {
  test('renders card shell', () => {
    const Component = () => <SkillCard />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('SkillCard')).toBeInTheDocument();
  });
});
