import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalMetricsInfoModal } from '../GlobalMetricsInfoModal';
import type { GlobalMetricsInfoModalProps } from '../GlobalMetricsInfoModal';

describe('GlobalMetricsInfoModal Component', () => {
  let component: RenderResult;
  let props: GlobalMetricsInfoModalProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalMetricsInfoModal {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
