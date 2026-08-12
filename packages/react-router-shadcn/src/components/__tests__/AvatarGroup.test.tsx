import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AvatarGroup } from '../AvatarGroup';
import type { AvatarGroupProps } from '../AvatarGroup';

describe('AvatarGroup', () => {
  test('renders the primitive with its data-slot and merges className', () => {
    const props: AvatarGroupProps = { className: 'custom-avatar-group' };
    const { container } = render(<AvatarGroup {...props}>Body</AvatarGroup>);
    const el = container.querySelector('[data-slot="avatar-group"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Body');
    expect(el).toHaveClass('custom-avatar-group');
  });

  test('forwards its ref to the underlying element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<AvatarGroup ref={ref}>Body</AvatarGroup>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
