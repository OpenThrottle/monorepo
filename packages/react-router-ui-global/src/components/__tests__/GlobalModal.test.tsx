import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalModal } from '../GlobalModal';
import type { GlobalModalProps } from '../GlobalModal';

describe('GlobalModal Component', () => {
  let component: RenderResult;
  let props: GlobalModalProps;

  beforeEach(() => {
    props = { param: 'modal', value: 'open' };

    const Component = () => <GlobalModal {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
