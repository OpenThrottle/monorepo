import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { AlertDescriptionProps } from '../AlertDescription';
import { AlertDescription } from '../AlertDescription';

describe('AlertDescription', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: AlertDescriptionProps = { className: 'custom-slot' };
    const { container } = render(
      <AlertDescription {...props}>Body</AlertDescription>,
    );
    const el = container.querySelector('[data-slot="alert-description"]');

    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-slot');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<AlertDescription ref={ref}>Body</AlertDescription>);

    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
