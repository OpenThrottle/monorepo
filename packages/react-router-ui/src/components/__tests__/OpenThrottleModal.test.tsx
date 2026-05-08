import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleModal } from '../OpenThrottleModal';
import type { OpenThrottleModalProps } from '../OpenThrottleModal';

describe('OpenThrottleModal Component', () => {
  let component: RenderResult;
  let props: OpenThrottleModalProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleModal {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
