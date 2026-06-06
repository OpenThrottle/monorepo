import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalScreen } from '../GlobalScreen';
import type { GlobalScreenProps } from '../GlobalScreen';

describe('GlobalScreen Component', () => {
  let component: RenderResult;
  let props: GlobalScreenProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalScreen {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
