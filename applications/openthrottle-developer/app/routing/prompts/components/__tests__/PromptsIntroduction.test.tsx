import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PromptsIntroduction } from '../PromptsIntroduction';

describe('PromptsIntroduction Component', () => {
  test('renders page title and explanatory copy', () => {
    const Component = () => <PromptsIntroduction />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Prompts' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Open a prompt for Prompt versioning and debug/i),
    ).toBeInTheDocument();
    expect(screen.getByText('filePath')).toBeInTheDocument();
  });
});
