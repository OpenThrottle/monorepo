import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Dialog } from '../Dialog';
import { DialogTrigger } from '../DialogTrigger';
import type { DialogTriggerProps } from '../DialogTrigger';

describe('DialogTrigger Component', () => {
  let component: RenderResult;
  let props: DialogTriggerProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Dialog>
        <DialogTrigger {...props}>Open dialog</DialogTrigger>
      </Dialog>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
