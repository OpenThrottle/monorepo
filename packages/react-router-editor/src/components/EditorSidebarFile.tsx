import * as React from 'react';
import clsx from 'clsx';
import { useEditor } from '../hooks/useEditor';
import { isHiddenFile } from '../utils';

export interface EditorSidebarFileProps {
  readonly basePath?: string;
  readonly filename: string;
  readonly id?: string;
}

/**
 * @description Individual file item in the editor sidebar.
 */
export const EditorSidebarFile = (
  props: EditorSidebarFileProps,
): React.ReactElement => {
  const { basePath = '/prompts', filename, id } = props;

  // Hooks
  const { editor, openFile } = useEditor({ basePath });

  // Setup
  const parts = filename.split('/');
  const name = parts[parts.length - 1] ?? filename;
  const isHidden = isHiddenFile(filename);
  const isActive = editor.filename === filename;

  // Handlers
  const onClick = (): void => {
    openFile(filename, id);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'cursor-pointer rounded-sm px-2 py-1 transition-colors',
        'hover:bg-white/10',
        {
          'bg-white/15': isActive,
          'text-gray-500': isHidden,
        },
      )}
      data-testid="EditorSidebarFile"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {name}
    </div>
  );
};
