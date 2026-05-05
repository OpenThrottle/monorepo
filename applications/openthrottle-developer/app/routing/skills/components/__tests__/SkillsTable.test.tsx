import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsTable } from '../SkillsTable';
import type { SkillsTableProps } from '../SkillsTable';

describe('SkillsTable Component', () => {
  let component: RenderResult;
  let props: SkillsTableProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillsTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
