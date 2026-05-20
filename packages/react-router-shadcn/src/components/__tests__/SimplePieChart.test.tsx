import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SimplePieChart } from '../SimplePieChart';

const sampleData = [
  { name: 'Chrome', value: 275 },
  { name: 'Safari', value: 200 },
  { name: 'Firefox', value: 120 },
];

describe('SimplePieChart', () => {
  it('should render with required data, nameKey, and valueKey', () => {
    const { container } = render(
      <SimplePieChart data={sampleData} nameKey="name" valueKey="value" />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.tagName).toBe('DIV');
  });

  it('should accept valueLabel and apply to config', () => {
    const { container } = render(
      <SimplePieChart
        data={sampleData}
        nameKey="name"
        valueKey="value"
        valueLabel="Visitors"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should accept variant donut', () => {
    const { container } = render(
      <SimplePieChart
        data={sampleData}
        nameKey="name"
        valueKey="value"
        variant="donut"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should accept custom innerRadiusRatio for donut', () => {
    const { container } = render(
      <SimplePieChart
        data={sampleData}
        innerRadiusRatio={0.5}
        nameKey="name"
        valueKey="value"
        variant="donut"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should merge custom className', () => {
    const { container } = render(
      <SimplePieChart
        className="min-h-[200px]"
        data={sampleData}
        nameKey="name"
        valueKey="value"
      />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('min-h-[200px]');
  });

  it('should render with empty data without throwing', () => {
    const { container } = render(
      <SimplePieChart data={[]} nameKey="name" valueKey="value" />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
