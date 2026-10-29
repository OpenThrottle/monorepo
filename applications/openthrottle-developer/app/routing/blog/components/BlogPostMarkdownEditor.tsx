import { EditorWindow } from '@openthrottle/react-router-editor';
import { Skeleton } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { useIsHydrated } from '~/global/hooks/useIsHydrated';
import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';
import { useBlogEditorTheme } from '~/routing/blog/hooks/useBlogEditorTheme';

export interface BlogPostMarkdownEditorProps {
  readonly onChange: (bodyMarkdown: string) => void;
  /** Keys Monaco's text model, so undo history never leaks between posts. */
  readonly postId: string;
  readonly value: string;
}

/**
 * @description The post body in Monaco (Markdown, word wrap on, theme following
 * the app's light/dark mode). Monaco cannot render on the server, so the server
 * render and the hydrating render both show a placeholder and the editor mounts
 * on the next client render, which keeps hydration clean.
 */
export const BlogPostMarkdownEditor = (
  props: BlogPostMarkdownEditorProps,
): React.ReactElement => {
  const { onChange, postId, value } = props;

  // Hooks
  const isHydrated = useIsHydrated();
  const theme = useBlogEditorTheme();

  // Setup

  // Handlers
  const handleChange = (next: string | undefined): void => {
    onChange(next ?? '');
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!isHydrated) {
    return (
      <div
        aria-busy="true"
        aria-label={BLOG_EDITOR_COPY.editorLoading}
        className="h-full p-4"
        data-testid="BlogPostMarkdownEditor"
      >
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <div
      aria-label={BLOG_EDITOR_COPY.bodyLabel}
      className="h-full"
      data-testid="BlogPostMarkdownEditor"
      role="group"
    >
      <EditorWindow
        height="100%"
        language="markdown"
        loading={BLOG_EDITOR_COPY.editorLoading}
        onChange={handleChange}
        options={{
          lineNumbers: 'off',
          padding: { top: 16 },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
        }}
        path={`blog/${postId}.md`}
        theme={theme}
        value={value}
      />
    </div>
  );
};
