import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsLogsServerStreams } from '../SettingsLogsServerStreams';
import type { SettingsLogsServerStreamsProps } from '../SettingsLogsServerStreams';

describe('SettingsLogsServerStreams Component', () => {
  let component: RenderResult;
  let props: SettingsLogsServerStreamsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <SettingsLogsServerStreams {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders the Workflow & Server Logs legend', () => {
    expect(component.getByText('Workflow & Server Logs')).toBeInTheDocument();
  });

  test('renders a link to the tools/workflows README', () => {
    const link = component.getByRole('link', {
      name: 'tools/workflows README',
    });
    expect(link).toHaveAttribute('target', '_blank');
  });
});
