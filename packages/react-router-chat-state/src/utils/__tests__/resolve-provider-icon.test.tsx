import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { resolveProviderIcon } from '../resolve-provider-icon';

describe('resolveProviderIcon', () => {
  test('returns a brand glyph for each known agent-CLI backend id', () => {
    for (const id of [
      'claude',
      'codex',
      'cursor',
      'gemini',
      'grok',
      'opencode',
    ]) {
      const node = resolveProviderIcon(id);
      expect(React.isValidElement(node)).toBe(true);
      const component = render(<span>{node}</span>);
      expect(component.container.querySelector('svg')).toBeInTheDocument();
      component.unmount();
    }
  });

  test('resolves any local OpenAI endpoint group id to the OpenAI glyph', () => {
    const node = resolveProviderIcon('openai:localhost:11434');
    const component = render(<span>{node}</span>);
    expect(component.container.querySelector('svg')).toBeInTheDocument();
  });

  test('is case-insensitive on the backend id', () => {
    const node = resolveProviderIcon('CLAUDE');
    const component = render(<span>{node}</span>);
    expect(component.container.querySelector('svg')).toBeInTheDocument();
  });

  test('falls back to a letter-avatar derived from an unknown id', () => {
    const component = render(<span>{resolveProviderIcon('mistral')}</span>);
    const letter = component.container.querySelector('[data-provider-letter]');
    expect(letter).toBeInTheDocument();
    expect(letter).toHaveAttribute('data-provider-letter', 'M');
    expect(letter).toHaveTextContent('M');
  });

  test('derives the letter from the first alphanumeric character', () => {
    const component = render(<span>{resolveProviderIcon('__weird-9x')}</span>);
    expect(
      component.container.querySelector('[data-provider-letter]'),
    ).toHaveAttribute('data-provider-letter', 'W');
  });

  test('renders a non-crashing fallback for an empty id', () => {
    const component = render(<span>{resolveProviderIcon('')}</span>);
    expect(
      component.container.querySelector('[data-provider-letter]'),
    ).toHaveAttribute('data-provider-letter', '?');
  });
});
