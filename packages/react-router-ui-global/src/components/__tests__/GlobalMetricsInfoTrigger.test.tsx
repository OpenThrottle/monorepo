import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { RenderResult } from '@testing-library/react';
import { GlobalMetricsInfoTrigger } from '../GlobalMetricsInfoTrigger';
import type { GlobalMetricsInfoTriggerProps } from '../GlobalMetricsInfoTrigger';

function Harness(props: GlobalMetricsInfoTriggerProps): React.ReactElement {
  const [searchParams] = useSearchParams();

  return (
    <div>
      <span data-testid="qs">{searchParams.toString()}</span>
      <GlobalMetricsInfoTrigger {...props} />
    </div>
  );
}

describe('GlobalMetricsInfoTrigger Component', () => {
  let component: RenderResult;
  let props: GlobalMetricsInfoTriggerProps;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    props = {};

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders an accessible trigger button', () => {
    const trigger = component.getByTestId('GlobalMetrics-info-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute(
      'aria-label',
      'Metrics interpretation help',
    );
  });

  test('sets modal=ServerMetricsInfo in the URL when clicked', async () => {
    const user = userEvent.setup();

    expect(component.getByTestId('qs')).toHaveTextContent('');

    await user.click(component.getByTestId('GlobalMetrics-info-trigger'));

    const qs = new URLSearchParams(
      component.getByTestId('qs').textContent ?? '',
    );
    expect(qs.get('modal')).toBe('ServerMetricsInfo');
  });

  test('preserves other search params already present in the URL', async () => {
    cleanup();
    const user = userEvent.setup();
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(
      <RoutesStub initialEntries={['/?keep=1']} />,
    );

    await user.click(getByTestId('GlobalMetrics-info-trigger'));

    const qs = new URLSearchParams(getByTestId('qs').textContent ?? '');
    expect(qs.get('modal')).toBe('ServerMetricsInfo');
    expect(qs.get('keep')).toBe('1');
  });

  test('forwards className to the trigger button', () => {
    cleanup();
    props = { className: 'text-red-500' };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <Harness {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { getByTestId } = render(<RoutesStub />);

    expect(getByTestId('GlobalMetrics-info-trigger')).toHaveClass(
      'text-red-500',
    );
  });

  test('exposes its modal key as a static property', () => {
    expect(GlobalMetricsInfoTrigger.key).toBe('ServerMetricsInfo');
  });
});
