import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { EmptyDescription } from '../EmptyDescription';
import type { EmptyDescriptionProps } from '../EmptyDescription';

describe('EmptyDescription', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: EmptyDescriptionProps = {
      className: 'custom-empty-description',
    };
    const { container } = render(
      <EmptyDescription {...props}>Body</EmptyDescription>,
    );
    const el = container.querySelector('[data-slot="empty-description"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-empty-description');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<EmptyDescription ref={ref}>Body</EmptyDescription>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
