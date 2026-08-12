import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CommanderFooter } from '../CommanderFooter';

describe('CommanderFooter Component', () => {
  test('renders the keyboard hints', () => {
    render(<CommanderFooter />);

    expect(screen.getByTestId('CommanderFooter')).toBeVisible();
    expect(screen.getByText('navigate')).toBeVisible();
    expect(screen.getByText('select')).toBeVisible();
    expect(screen.getByText('close')).toBeVisible();
  });

  test('does not render a hint when footerHint is omitted', () => {
    render(<CommanderFooter />);

    expect(
      screen.getByTestId('CommanderFooter').querySelector('span.line-clamp-2'),
    ).not.toBeInTheDocument();
  });

  test('renders the footerHint text when provided', () => {
    render(<CommanderFooter footerHint="Paste a plan or task UUID" />);

    expect(screen.getByText('Paste a plan or task UUID')).toBeVisible();
  });
});
