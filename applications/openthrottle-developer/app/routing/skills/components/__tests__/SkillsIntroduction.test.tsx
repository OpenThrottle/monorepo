import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillsIntroduction } from '../SkillsIntroduction';

describe('SkillsIntroduction Component', () => {
  test('renders page title and explanatory copy', () => {
    const Component = () => <SkillsIntroduction />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Skills' }),
    ).toBeInTheDocument();
    expect(screen.getByText('SKILL.md')).toBeInTheDocument();
    expect(screen.getByText(/Discovered/i)).toBeInTheDocument();
  });
});
