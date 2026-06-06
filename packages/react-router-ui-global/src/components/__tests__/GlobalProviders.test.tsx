import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalProviders } from '../GlobalProviders';
import type { GlobalProvidersProps } from '../GlobalProviders';

describe('GlobalProviders Component', () => {
  let component: RenderResult;
  let props: GlobalProvidersProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalProviders {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
