import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { UsageSnapshot } from '../UsageSnapshot';
import type { UsageSnapshotProps } from '../UsageSnapshot';

describe('UsageSnapshot Component', () => {
  let component: RenderResult;
  let props: UsageSnapshotProps;

  beforeEach(() => {
    props = {};

    const Component = () => <UsageSnapshot {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
