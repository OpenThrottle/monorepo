import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillsOverviewDialog } from '../SkillsOverviewDialog';

describe('SkillsOverviewDialog Component', () => {
  test('renders dialog trigger around provided children', () => {
    const Component = () => (
      <SkillsOverviewDialog>
        <span>Skills overview trigger</span>
      </SkillsOverviewDialog>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByText('Skills overview trigger')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
