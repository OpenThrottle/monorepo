import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { AlertProps } from '../Alert';
import { Alert } from '../Alert';

describe('Alert', () => {
  test('renders an alert role with its data-slot and merges className', () => {
    const props: AlertProps = { className: 'custom-alert' };
    const component = render(<Alert {...props}>Body</Alert>);
    const el = component.getByRole('alert');

    expect(el).toHaveAttribute('data-slot', 'alert');
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-alert');
  });

  describe('when the destructive variant is set', () => {
    test('applies the destructive text token', () => {
      const component = render(<Alert variant="destructive">Body</Alert>);

      expect(component.getByRole('alert')).toHaveClass('text-destructive');
    });
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Alert ref={ref}>Body</Alert>);

    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
