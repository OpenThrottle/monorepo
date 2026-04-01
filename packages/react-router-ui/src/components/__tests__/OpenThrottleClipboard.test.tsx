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
    props = {};

    const Component = () => <OpenThrottleClipboard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
