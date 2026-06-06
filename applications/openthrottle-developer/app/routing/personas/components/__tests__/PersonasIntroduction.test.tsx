import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PersonasIntroduction } from '../PersonasIntroduction';

describe('PersonasIntroduction Component', () => {
  test('renders personas heading and intro copy', () => {
    const Component = () => <PersonasIntroduction />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(
      screen.getByRole('heading', { name: 'Personas' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Agentic personas represent/i)).toBeInTheDocument();
  });
});
