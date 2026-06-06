import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PersonasStats } from '../PersonasStats';
import type { PersonasStatsProps } from '../PersonasStats';

describe('PersonasStats Component', () => {
  let component: RenderResult;
  let props: PersonasStatsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PersonasStats {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
