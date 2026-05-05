import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsOverview } from '../SkillsOverview';
import type { SkillsOverviewProps } from '../SkillsOverview';

describe('SkillsOverview Component', () => {
  let component: RenderResult;
  let props: SkillsOverviewProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillsOverview {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
