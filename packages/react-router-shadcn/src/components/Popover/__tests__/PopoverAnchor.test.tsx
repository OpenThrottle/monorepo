import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PopoverAnchor } from '../PopoverAnchor';
import type { PopoverAnchorProps } from '../PopoverAnchor';

describe('PopoverAnchor Component', () => {
  let component: RenderResult;
  let props: PopoverAnchorProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PopoverAnchor {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
