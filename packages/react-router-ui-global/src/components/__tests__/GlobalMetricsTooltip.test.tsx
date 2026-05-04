import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalProviders } from '../GlobalProviders';
import { GlobalMetricsTooltip } from '../GlobalMetricsTooltip';
import type { GlobalMetricsTooltipProps } from '../GlobalMetricsTooltip';

describe('GlobalMetricsTooltip Component', () => {
  let component: RenderResult;
  let props: GlobalMetricsTooltipProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <GlobalProviders>
        <GlobalMetricsTooltip {...props} />
      </GlobalProviders>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
