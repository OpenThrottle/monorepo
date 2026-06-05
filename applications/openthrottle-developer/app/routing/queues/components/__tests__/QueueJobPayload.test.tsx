import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueueJobPayload } from '../QueueJobPayload';
import type { QueueJobPayloadProps } from '../QueueJobPayload';

describe('QueueJobPayload Component', () => {
  let component: RenderResult;
  let props: QueueJobPayloadProps;

  beforeEach(() => {
    props = {};

    const Component = () => <QueueJobPayload {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
