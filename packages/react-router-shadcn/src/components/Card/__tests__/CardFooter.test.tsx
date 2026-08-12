import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CardFooter } from '../CardFooter';
import type { CardFooterProps } from '../CardFooter';

describe('CardFooter', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: CardFooterProps = { className: 'custom-card-footer' };
    const { container } = render(<CardFooter {...props}>Body</CardFooter>);
    const el = container.querySelector('[data-slot="card-footer"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-card-footer');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardFooter ref={ref}>Body</CardFooter>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
