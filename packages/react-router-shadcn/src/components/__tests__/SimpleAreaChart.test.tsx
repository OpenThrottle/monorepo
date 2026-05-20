import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SimpleAreaChart } from '../SimpleAreaChart';

const sampleData = [
  { name: 'Jan', value: 120 },
  { name: 'Feb', value: 98 },
  { name: 'Mar', value: 140 },
];

describe('SimpleAreaChart', () => {
  it('should render with required data, categoryKey, and valueKey', () => {
    const { container } = render(
      <SimpleAreaChart categoryKey="name" data={sampleData} valueKey="value" />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.tagName).toBe('DIV');
  });

  it('should accept valueLabel and apply to config', () => {
    const { container } = render(
      <SimpleAreaChart
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
      <SimpleAreaChart
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
      <SimpleAreaChart
        categoryKey="name"
        curveType="linear"
        data={sampleData}
        valueKey="value"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should accept fillOpacity', () => {
    const { container } = render(
      <SimpleAreaChart
        categoryKey="name"
        data={sampleData}
        fillOpacity={0.2}
        valueKey="value"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should merge custom className', () => {
    const { container } = render(
      <SimpleAreaChart
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
      <SimpleAreaChart categoryKey="name" data={[]} valueKey="value" />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
