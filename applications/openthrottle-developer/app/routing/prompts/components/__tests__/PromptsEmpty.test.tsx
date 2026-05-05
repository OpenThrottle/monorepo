import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PromptsEmpty } from '../PromptsEmpty';
import type { PromptsEmptyProps } from '../PromptsEmpty';

describe('PromptsEmpty Component', () => {
  let component: RenderResult;
  let props: PromptsEmptyProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PromptsEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
