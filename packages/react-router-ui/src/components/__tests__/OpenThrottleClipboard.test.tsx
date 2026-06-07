import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleClipboard } from '../OpenThrottleClipboard';
import type { OpenThrottleClipboardProps } from '../OpenThrottleClipboard';

describe('OpenThrottleClipboard Component', () => {
  let component: RenderResult;
  let props: OpenThrottleClipboardProps;

  beforeEach(() => {
    props = { text: '' };

    const Component = () => <OpenThrottleClipboard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders copy button with default label', () => {
    expect(
      component.getByRole('button', { name: 'Copy to clipboard' }),
    ).toBeInTheDocument();
  });
});
