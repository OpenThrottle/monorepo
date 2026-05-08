import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GeneratorTabDocumentation } from '../GeneratorTabDocumentation';
import type { GeneratorTabDocumentationProps } from '../GeneratorTabDocumentation';

describe('GeneratorTabDocumentation Component', () => {
  let component: RenderResult;
  let props: GeneratorTabDocumentationProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GeneratorTabDocumentation {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
