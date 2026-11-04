import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { EmptyTitleProps } from '../EmptyTitle';
import { EmptyTitle } from '../EmptyTitle';

describe('EmptyTitle', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: EmptyTitleProps = { className: 'custom-empty-title' };
    const { container } = render(<EmptyTitle {...props}>Body</EmptyTitle>);
    const el = container.querySelector('[data-slot="empty-title"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-empty-title');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<EmptyTitle ref={ref}>Body</EmptyTitle>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
