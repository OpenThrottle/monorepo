import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GeneratorTabSchema } from '../GeneratorTabSchema';
import type { GeneratorTabSchemaProps } from '../GeneratorTabSchema';

describe('GeneratorTabSchema Component', () => {
  let component: RenderResult;
  let props: GeneratorTabSchemaProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GeneratorTabSchema {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
