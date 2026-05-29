import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleWebsocketDebugger } from '../OpenThrottleWebsocketDebugger';
import type { OpenThrottleWebsocketDebuggerProps } from '../OpenThrottleWebsocketDebugger';

describe('OpenThrottleWebsocketDebugger Component', () => {
  let component: RenderResult;
  let props: OpenThrottleWebsocketDebuggerProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleWebsocketDebugger {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
