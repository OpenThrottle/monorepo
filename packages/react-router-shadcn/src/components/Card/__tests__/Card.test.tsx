import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Card } from '../Card';
import type { CardProps } from '../Card';

describe('Card', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: CardProps = { className: 'custom-card' };
    const { container } = render(<Card {...props}>Body</Card>);
    const el = container.querySelector('[data-slot="card"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-card');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Body</Card>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
