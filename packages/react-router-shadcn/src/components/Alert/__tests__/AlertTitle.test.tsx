import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { AlertTitleProps } from '../AlertTitle';
import { AlertTitle } from '../AlertTitle';

describe('AlertTitle', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: AlertTitleProps = { className: 'custom-slot' };
    const { container } = render(<AlertTitle {...props}>Body</AlertTitle>);
    const el = container.querySelector('[data-slot="alert-title"]');

    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-slot');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<AlertTitle ref={ref}>Body</AlertTitle>);

    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
