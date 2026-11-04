import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { EmptyMediaProps } from '../EmptyMedia';
import { EmptyMedia } from '../EmptyMedia';

describe('EmptyMedia', () => {
  test('renders with the default variant', () => {
    const props: EmptyMediaProps = {};
    const { container } = render(
      <EmptyMedia {...props}>
        <span>Icon</span>
      </EmptyMedia>,
    );
    const el = container.querySelector('[data-slot="empty-icon"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('data-variant', 'default');
    expect(el).toHaveTextContent('Icon');
  });

  test('applies the icon variant via data-variant', () => {
    const { container } = render(<EmptyMedia variant="icon">I</EmptyMedia>);
    const el = container.querySelector('[data-slot="empty-icon"]');
    expect(el).toHaveAttribute('data-variant', 'icon');
  });
});
