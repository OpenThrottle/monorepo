import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { ChatThinkingBlock } from '../ChatThinkingBlock';
import type { ChatThinkingBlockProps } from '../ChatThinkingBlock';

describe('ChatThinkingBlock Component', () => {
  let component: RenderResult;

  const renderBlock = (props: ChatThinkingBlockProps): RenderResult =>
    render(<ChatThinkingBlock {...props} />);

  describe('when reasoning is empty or whitespace', () => {
    test('renders nothing for an empty string', () => {
      component = renderBlock({ text: '' });
      expect(
        component.queryByTestId('ChatThinkingBlock'),
      ).not.toBeInTheDocument();
    });

    test('renders nothing for whitespace-only reasoning', () => {
      component = renderBlock({ text: '   \n  ' });
      expect(
        component.queryByTestId('ChatThinkingBlock'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when reasoning is present', () => {
    beforeEach(() => {
      component = renderBlock({ text: 'weigh the options' });
    });

    test('shows a Thinking affordance', () => {
      expect(component.getByText('Thinking')).toBeInTheDocument();
    });

    test('is collapsed by default', () => {
      const trigger = component.getByTestId('ChatThinkingBlock-trigger');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(
        component.queryByText('weigh the options'),
      ).not.toBeInTheDocument();
    });

    test('expands to reveal reasoning on click, then collapses again', async () => {
      const user = userEvent.setup();
      const trigger = component.getByTestId('ChatThinkingBlock-trigger');

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(component.getByText('weigh the options')).toBeInTheDocument();

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('when starting expanded', () => {
    test('honors defaultOpen and shows reasoning immediately', () => {
      component = renderBlock({ defaultOpen: true, text: 'initial reasoning' });

      expect(
        component.getByTestId('ChatThinkingBlock-trigger'),
      ).toHaveAttribute('aria-expanded', 'true');
      expect(component.getByText('initial reasoning')).toBeInTheDocument();
    });

    test('bounds very long reasoning with a scrollable content region', () => {
      component = renderBlock({
        defaultOpen: true,
        text: 'x'.repeat(5000),
      });

      const content = component.getByTestId('ChatThinkingBlock-content');
      expect(content.className).toContain('max-h-64');
      expect(content.className).toContain('overflow-auto');
    });

    test('grows as streamed thinking deltas accumulate', () => {
      component = renderBlock({ defaultOpen: true, text: 'first' });
      expect(component.getByText('first')).toBeInTheDocument();

      component.rerender(
        <ChatThinkingBlock defaultOpen={true} text="first second" />,
      );
      expect(component.getByText('first second')).toBeInTheDocument();
    });
  });

  describe('when reasoning is untrusted model output', () => {
    test('renders an HTML payload as literal text, not a live element', () => {
      const payload = '<img src=x onerror="window.__xss = true">';
      component = renderBlock({ defaultOpen: true, text: payload });

      expect(component.getByText(payload)).toBeInTheDocument();
      expect(component.container.querySelector('img')).not.toBeInTheDocument();
    });
  });
});
