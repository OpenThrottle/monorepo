import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { EmptyHeaderProps } from '../EmptyHeader';
import { EmptyHeader } from '../EmptyHeader';

describe('EmptyHeader', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: EmptyHeaderProps = { className: 'custom-empty-header' };
    const { container } = render(<EmptyHeader {...props}>Body</EmptyHeader>);
    const el = container.querySelector('[data-slot="empty-header"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-empty-header');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<EmptyHeader ref={ref}>Body</EmptyHeader>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
