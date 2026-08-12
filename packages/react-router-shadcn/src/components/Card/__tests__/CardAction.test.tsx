import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { CardAction } from '../CardAction';
import type { CardActionProps } from '../CardAction';

describe('CardAction', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: CardActionProps = { className: 'custom-card-action' };
    const { container } = render(<CardAction {...props}>Body</CardAction>);
    const el = container.querySelector('[data-slot="card-action"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-card-action');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardAction ref={ref}>Body</CardAction>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
