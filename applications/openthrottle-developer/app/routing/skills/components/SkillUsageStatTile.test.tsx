import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SkillUsageStatTile } from './SkillUsageStatTile';
import type { SkillUsageStatTileProps } from './SkillUsageStatTile';

describe('SkillUsageStatTile Component', () => {
  let component: RenderResult;
  let props: SkillUsageStatTileProps;

  beforeEach(() => {
    props = { label: 'Total Runs', value: 42 };
    component = render(<SkillUsageStatTile {...props} />);
  });

  test('renders the label', () => {
    expect(component.getByText('Total Runs')).toBeInTheDocument();
  });

  test('renders the value', () => {
    expect(component.getByText('42')).toBeInTheDocument();
  });

  test('renders a React node value', () => {
    component = render(
      <SkillUsageStatTile label="Last Used" value={<span>2 days ago</span>} />,
    );

    expect(component.getByText('2 days ago')).toBeInTheDocument();
  });
});
