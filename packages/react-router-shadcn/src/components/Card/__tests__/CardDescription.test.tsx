import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CardDescription } from '../CardDescription';
import type { CardDescriptionProps } from '../CardDescription';

describe('CardDescription', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: CardDescriptionProps = {
      className: 'custom-card-description',
    };
    const { container } = render(
      <CardDescription {...props}>Body</CardDescription>,
    );
    const el = container.querySelector('[data-slot="card-description"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-card-description');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardDescription ref={ref}>Body</CardDescription>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
