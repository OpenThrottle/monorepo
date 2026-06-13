import * as React from 'react';
import classnames from 'classnames';

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
      className={classnames('markdown max-w-full overflow-auto', className)}
      contentEditable={contentEditable}
    >
      <code>
        <pre>{value}</pre>
      </code>
    </div>
  );
};
