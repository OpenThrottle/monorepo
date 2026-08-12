import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CardHeader } from '../CardHeader';
import type { CardHeaderProps } from '../CardHeader';

describe('CardHeader', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: CardHeaderProps = { className: 'custom-card-header' };
    const { container } = render(<CardHeader {...props}>Body</CardHeader>);
    const el = container.querySelector('[data-slot="card-header"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-card-header');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardHeader ref={ref}>Body</CardHeader>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
