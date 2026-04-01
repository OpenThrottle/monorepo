import classnames from 'classnames';

export interface MarkdownProps {
  className?: string;
  content?: string | Record<string, unknown>;
  contentEditable?: boolean;
}

export const Markdown = (props: MarkdownProps) => {
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
      className={classnames('markdown', className)}
      contentEditable={contentEditable}
    >
      <code>
        <pre>{value}</pre>
      </code>
    </div>
  );
};
