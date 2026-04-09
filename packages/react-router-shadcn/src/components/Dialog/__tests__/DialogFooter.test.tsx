import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DialogFooter } from '../DialogFooter';
import type { DialogFooterProps } from '../DialogFooter';

describe('DialogFooter Component', () => {
  let component: RenderResult;
  let props: DialogFooterProps;

  beforeEach(() => {
    props = {};

    const Component = () => <DialogFooter {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
