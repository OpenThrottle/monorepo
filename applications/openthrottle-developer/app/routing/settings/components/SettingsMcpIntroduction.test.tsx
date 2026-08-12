import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsMcpIntroduction } from './SettingsMcpIntroduction';
import type { SettingsMcpIntroductionProps } from './SettingsMcpIntroduction';

describe('SettingsMcpIntroduction Component', () => {
  let component: RenderResult;
  let props: SettingsMcpIntroductionProps;

  beforeEach(() => {
    props = {};
    component = render(<SettingsMcpIntroduction {...props} />);
  });

  test('renders the MCP connectors heading', () => {
    expect(
      component.getByRole('heading', { name: 'MCP connectors' }),
    ).toBeInTheDocument();
  });

  test('renders the introductory copy', () => {
    expect(
      component.getByText(/Connect external MCP servers/i),
    ).toBeInTheDocument();
  });

  test('renders when a className prop is provided', () => {
    component.unmount();
    props = { className: 'custom-class' };
    component = render(<SettingsMcpIntroduction {...props} />);

    expect(
      component.getByRole('heading', { name: 'MCP connectors' }),
    ).toBeInTheDocument();
  });
});
