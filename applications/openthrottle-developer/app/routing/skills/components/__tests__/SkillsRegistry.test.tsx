import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsRegistry } from '../SkillsRegistry';
import type { SkillsRegistryProps } from '../SkillsRegistry';

describe('SkillsRegistry Component', () => {
  let component: RenderResult;
  let props: SkillsRegistryProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillsRegistry {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
