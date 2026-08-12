import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CardContent } from '../CardContent';
import type { CardContentProps } from '../CardContent';

describe('CardContent', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: CardContentProps = { className: 'custom-card-content' };
    const { container } = render(<CardContent {...props}>Body</CardContent>);
    const el = container.querySelector('[data-slot="card-content"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-card-content');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardContent ref={ref}>Body</CardContent>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
