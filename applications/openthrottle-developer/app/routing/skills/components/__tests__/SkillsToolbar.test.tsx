import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillsToolbar } from '../SkillsToolbar';
import type { SkillsToolbarProps } from '../SkillsToolbar';

describe('SkillsToolbar Component', () => {
  let component: RenderResult;
  let props: SkillsToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SkillsToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render search input with placeholder and search button', () => {
    const placeholder = `Filter by slug, path, or summary`;

    expect(component.getByPlaceholderText(placeholder)).toBeInTheDocument();
    expect(component.getByText('Search')).toBeInTheDocument();
  });
});
