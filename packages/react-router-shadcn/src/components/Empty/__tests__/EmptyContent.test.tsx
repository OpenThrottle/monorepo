import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { EmptyContent } from '../EmptyContent';
import type { EmptyContentProps } from '../EmptyContent';

describe('EmptyContent', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: EmptyContentProps = { className: 'custom-empty-content' };
    const { container } = render(<EmptyContent {...props}>Body</EmptyContent>);
    const el = container.querySelector('[data-slot="empty-content"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-empty-content');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<EmptyContent ref={ref}>Body</EmptyContent>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
