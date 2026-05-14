import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillCard } from '../SkillCard';
import type { SkillCardProps } from '../SkillCard';

describe('SkillCard Component', () => {
  let component: RenderResult;
  let props: SkillCardProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
