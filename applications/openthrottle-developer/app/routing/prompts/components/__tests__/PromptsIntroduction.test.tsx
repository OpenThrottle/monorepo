import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PromptsIntroduction } from '../PromptsIntroduction';
import type { PromptsIntroductionProps } from '../PromptsIntroduction';

describe('PromptsIntroduction Component', () => {
  let component: RenderResult;
  let props: PromptsIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PromptsIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
