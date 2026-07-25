import * as React from 'react';
import clsx from 'clsx';

export interface MarkdownProps {
  className?: string;
  content?: string | Record<string, unknown>;
  contentEditable?: boolean;
}

export const Markdown = (props: MarkdownProps): React.ReactElement => {
  const { className, content = {}, contentEditable = false } = props;

  // Hooks

  // Setup
  const isString = typeof content === 'string';
  const value = isString ? content : JSON.stringify(content, undefined, 2);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuits

  return (
    <div
      className={clsx('markdown max-w-full overflow-auto', className)}
      contentEditable={contentEditable}
    >
      <pre>
        <code>{value}</code>
      </pre>
    </div>
  );
};
