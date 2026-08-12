import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Empty } from '../Empty';
import type { EmptyProps } from '../Empty';

describe('Empty', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: EmptyProps = { className: 'custom-empty' };
    const { container } = render(<Empty {...props}>Body</Empty>);
    const el = container.querySelector('[data-slot="empty"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-empty');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Empty ref={ref}>Body</Empty>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
