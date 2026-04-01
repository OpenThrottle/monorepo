import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SimpleBarChart } from '../SimpleBarChart';

const sampleData = [
  { mb: 120.5, name: 'RSS' },
  { mb: 85.2, name: 'Heap used' },
  { mb: 100, name: 'Heap total' },
];

describe('SimpleBarChart', () => {
  it('should render with required data, categoryKey, and valueKey', () => {
    const { container } = render(
      <SimpleBarChart categoryKey="name" data={sampleData} valueKey="mb" />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.tagName).toBe('DIV');
  });

  it('should accept valueLabel and apply to config', () => {
    const { container } = render(
      <SimpleBarChart
        categoryKey="name"
        data={sampleData}
        valueKey="mb"
        valueLabel="MB"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should accept custom color', () => {
    const { container } = render(
      <SimpleBarChart
        categoryKey="name"
        color="var(--chart-2)"
        data={sampleData}
        valueKey="mb"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should accept layout vertical', () => {
    const { container } = render(
      <SimpleBarChart
        categoryKey="name"
        data={sampleData}
        layout="vertical"
        valueKey="mb"
      />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('should merge custom className', () => {
    const { container } = render(
      <SimpleBarChart
        categoryKey="name"
        className="min-h-[200px]"
        data={sampleData}
        valueKey="mb"
      />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('min-h-[200px]');
  });

  it('should render with empty data without throwing', () => {
    const { container } = render(
      <SimpleBarChart categoryKey="name" data={[]} valueKey="mb" />,
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
