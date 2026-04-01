import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleStatCard } from '../OpenThrottleStatCard';
import type { OpenThrottleStatCardProps } from '../OpenThrottleStatCard';

describe('OpenThrottleStatCard Component', () => {
  let component: RenderResult;
  let props: OpenThrottleStatCardProps;

  beforeEach(() => {
    props = { title: 'Total plans', value: 12 };
  });

  test('should render with title and value only', () => {
    const Component = () => <OpenThrottleStatCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
    expect(component.getByText('12')).toBeInTheDocument();
    expect(component.getByText('Total plans')).toBeInTheDocument();
    expect(component.queryByText('/')).not.toBeInTheDocument();
  });

  test('should render value and subValue as "value / subValue" when subValue is passed', () => {
    props = { subValue: 512, title: 'Heap (MB)', value: 450.2 };
    const Component = () => <OpenThrottleStatCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
    expect(component.getByText('450.2 / 512')).toBeInTheDocument();
    expect(component.getByText('Heap (MB)')).toBeInTheDocument();
  });
});
