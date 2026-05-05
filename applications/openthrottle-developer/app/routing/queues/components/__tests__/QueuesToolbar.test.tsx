import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueuesToolbar } from '../QueuesToolbar';
import type { QueuesToolbarProps } from '../QueuesToolbar';

describe('QueuesToolbar Component', () => {
  let component: RenderResult;
  let props: QueuesToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <QueuesToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
