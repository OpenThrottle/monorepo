import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SimpleLineChart } from '../SimpleLineChart';

const sampleData = [
  { name: 'Jan', value: 120 },
  { name: 'Feb', value: 98 },
  { name: 'Mar', value: 140 },
];

describe('SimpleLineChart', () => {
  it('should render with required data, categoryKey, and valueKey', () => {
    const { container } = render(
      <SimpleLineChart categoryKey="name" data={sampleData} valueKey="value" />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.tagName).toBe('DIV');
  });

  it('should accept valueLabel and apply to config', () => {
    const { container } = render(
      <SimpleLineChart
        categoryKey="name"
        data={sampleData}
        valueKey="value"
        valueLabel="Count"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should accept custom color', () => {
    const { container } = render(
      <SimpleLineChart
        categoryKey="name"
        color="var(--chart-2)"
        data={sampleData}
        valueKey="value"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should accept curveType', () => {
    const { container } = render(
      <SimpleLineChart
        categoryKey="name"
        curveType="linear"
        data={sampleData}
        valueKey="value"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should accept showDots false', () => {
    const { container } = render(
      <SimpleLineChart
        categoryKey="name"
        data={sampleData}
        showDots={false}
        valueKey="value"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should merge custom className', () => {
    const { container } = render(
      <SimpleLineChart
        categoryKey="name"
        className="min-h-[200px]"
        data={sampleData}
        valueKey="value"
      />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('min-h-[200px]');
  });

  it('should render with empty data without throwing', () => {
    const { container } = render(
      <SimpleLineChart categoryKey="name" data={[]} valueKey="value" />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
