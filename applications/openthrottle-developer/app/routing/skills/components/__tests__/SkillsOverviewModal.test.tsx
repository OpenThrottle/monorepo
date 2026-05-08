import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsOverviewModal } from '../SkillsOverviewModal';
import type { SkillsOverviewModalProps } from '../SkillsOverviewModal';

describe('SkillsOverviewModal Component', () => {
  let component: RenderResult;
  let props: SkillsOverviewModalProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillsOverviewModal {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
