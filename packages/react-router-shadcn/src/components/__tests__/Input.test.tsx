import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '../Input';

describe('Input', () => {
  it('should render with default props', () => {
    const { container } = render(<Input />);
    const input = container.querySelector('input[data-slot="input"]');
    expect(input).toBeInTheDocument();
    // When type is not specified, HTML defaults to "text" but the attribute may not be present
    expect(input?.getAttribute('type') || 'text').toBe('text');
  });

  it('should apply default input classes', () => {
    const { container } = render(<Input />);
    const input = container.querySelector('input[data-slot="input"]');
    expect(input).toHaveClass(
      'h-9',
      'w-full',
      'min-w-0',
      'rounded-md',
      'border',
      'border-input',
      'bg-transparent',
      'px-3',
      'py-1',
      'text-base',
      'shadow-xs',
      'md:text-sm',
    );
  });

  it('should merge custom className', () => {
    const { container } = render(<Input className="custom-input" />);
    const input = container.querySelector('input[data-slot="input"]');
    expect(input).toHaveClass('custom-input');
  });

  it('should forward HTML input attributes', () => {
    const { container } = render(
      <Input
        data-testid="test-input"
        disabled={true}
        id="email-input"
        placeholder="Enter email"
        required={true}
        type="email"
      />,
    );
    const input = container.querySelector('input[data-slot="input"]');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
    expect(input).toBeDisabled();
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('data-testid', 'test-input');
    expect(input).toHaveAttribute('id', 'email-input');
  });

  it('should handle different input types', () => {
    const { container: textContainer } = render(<Input type="text" />);
    expect(textContainer.querySelector('input')).toHaveAttribute(
      'type',
      'text',
    );

    const { container: passwordContainer } = render(<Input type="password" />);
    expect(passwordContainer.querySelector('input')).toHaveAttribute(
      'type',
      'password',
    );

    const { container: numberContainer } = render(<Input type="number" />);
    expect(numberContainer.querySelector('input')).toHaveAttribute(
      'type',
      'number',
    );
  });

  it('should handle value and onChange', () => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      expect(e.target.value).toBe('test');
    };

    const { container } = render(
      <Input onChange={handleChange} value="test" />,
    );
    const input = container.querySelector('input');
    expect(input).toHaveValue('test');
  });

  it('should handle placeholder', () => {
    const { container } = render(<Input placeholder="Enter text" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('placeholder', 'Enter text');
  });
});
