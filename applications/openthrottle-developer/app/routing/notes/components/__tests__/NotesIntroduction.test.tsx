import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { NotesIntroduction } from '../NotesIntroduction';

describe('NotesIntroduction Component', () => {
  test('renders notes heading and intro copy', () => {
    const Component = () => <NotesIntroduction />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
    expect(
      screen.getByText(/unstructured thoughts and ideas/i),
    ).toBeInTheDocument();
  });
});
