import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PromptsStats } from '../PromptsStats';
import type { PromptsStatsProps } from '../PromptsStats';

describe('PromptsStats Component', () => {
  let component: RenderResult;
  let props: PromptsStatsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PromptsStats {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
