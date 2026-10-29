import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { renderWithProviders } from '~/testing/route-fixtures';

import { BlogPostMarkdownEditor } from '../BlogPostMarkdownEditor';

const editorProps = vi.fn<(props: Record<string, unknown>) => void>();

// Monaco cannot boot under jsdom; a textarea keeps the same value/onChange contract.
vi.mock('@openthrottle/react-router-editor', () => ({
  EditorWindow: (props: {
    readonly onChange?: (value: string | undefined) => void;
    readonly value?: string;
  }) => {
    editorProps(props);

    return (
      <textarea
        aria-label="Markdown body"
        onChange={(event) => props.onChange?.(event.target.value)}
        value={props.value}
      />
    );
  },
}));

describe('BlogPostMarkdownEditor Component', () => {
  test('edits the body as Markdown with word wrap, keyed by post', async () => {
    const onChange = vi.fn();
    const component = renderWithProviders(
      <BlogPostMarkdownEditor onChange={onChange} postId="post-1" value="" />,
    );

    await userEvent
      .setup()
      .type(component.getByRole('textbox', { name: 'Markdown body' }), '#');

    expect(onChange).toHaveBeenCalledWith('#');
    expect(editorProps).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'markdown',
        options: expect.objectContaining({ wordWrap: 'on' }),
        path: 'blog/post-1.md',
        theme: 'light',
      }),
    );
  });
});
