import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DialogDescription } from '../DialogDescription';
import type { DialogDescriptionProps } from '../DialogDescription';

describe('DialogDescription Component', () => {
  let component: RenderResult;
  let props: DialogDescriptionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <DialogDescription {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
