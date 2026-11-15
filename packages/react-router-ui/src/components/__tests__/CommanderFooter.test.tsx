import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { CommanderFooter } from '../CommanderFooter';

describe('CommanderFooter Component', () => {
  test('renders the keyboard hints', () => {
    const component = render(<CommanderFooter />);

    expect(component.getByTestId('CommanderFooter')).toBeVisible();
    expect(component.getByText('navigate')).toBeVisible();
    expect(component.getByText('select')).toBeVisible();
    expect(component.getByText('close')).toBeVisible();
  });

  test('does not render a hint when footerHint is omitted', () => {
    const component = render(<CommanderFooter />);

    expect(
      component
        .getByTestId('CommanderFooter')
        .querySelector('span.line-clamp-2'),
    ).not.toBeInTheDocument();
  });

  test('renders the footerHint text when provided', () => {
    const component = render(
      <CommanderFooter footerHint="Paste a plan or task UUID" />,
    );

    expect(component.getByText('Paste a plan or task UUID')).toBeVisible();
  });
});
