import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CardTitle } from '../CardTitle';
import type { CardTitleProps } from '../CardTitle';

describe('CardTitle', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: CardTitleProps = { className: 'custom-card-title' };
    const { container } = render(<CardTitle {...props}>Body</CardTitle>);
    const el = container.querySelector('[data-slot="card-title"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-card-title');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardTitle ref={ref}>Body</CardTitle>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
