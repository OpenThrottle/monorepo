import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PersonasToolbar } from '../PersonasToolbar';
import type { PersonasToolbarProps } from '../PersonasToolbar';

describe('PersonasToolbar Component', () => {
  let component: RenderResult;
  let props: PersonasToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PersonasToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
