import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { ButtonProps } from '../Button';
import { Button } from '../Button';

const renderButton = (
  props: ButtonProps,
  onClick: (() => void) | undefined = undefined,
): RenderResult => {
  const Component = (): React.ReactElement => {
    return (
      <div onClick={onClick}>
        <Button {...props} />
      </div>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('Button Component', () => {
  describe('with defaults', () => {
    test('renders a primary, medium button with the cta', async () => {
      const component = renderButton({ cta: 'Call to action' });
      const button = await component.findByRole('button', {
        name: 'Call to action',
      });

      expect(button).toHaveAttribute('data-variant', 'default');
      expect(button).toHaveAttribute('data-size', 'default');
    });
  });

  describe('when secondary', () => {
    test('uses the ghost variant', async () => {
      const component = renderButton({ cta: 'Go', variant: 'secondary' });

      expect(await component.findByRole('button')).toHaveAttribute(
        'data-variant',
        'ghost',
      );
    });
  });

  describe('when xl', () => {
    test('rides the lg size with extra sizing classes', async () => {
      const component = renderButton({ cta: 'Go', size: 'xl' });
      const button = await component.findByRole('button');

      expect(button).toHaveAttribute('data-size', 'lg');
      expect(button).toHaveClass('h-12', 'px-8');
    });
  });

  describe('form attributes', () => {
    test('passes name, value and className through', async () => {
      const component = renderButton({
        className: 'uppercase',
        cta: 'Go',
        name: 'intent',
        value: 'subscribe',
      });
      const button = await component.findByRole('button');

      expect(button).toHaveAttribute('name', 'intent');
      expect(button).toHaveAttribute('value', 'subscribe');
      expect(button).toHaveClass('uppercase');
    });
  });

  describe('when disabled', () => {
    test('is disabled and ignores clicks', async () => {
      const onClick = vi.fn();
      const component = renderButton({ cta: 'Go', disabled: true }, onClick);
      const button = await component.findByRole('button');

      await userEvent.click(button);

      expect(button).toBeDisabled();
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
