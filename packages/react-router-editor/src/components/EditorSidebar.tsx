import * as React from 'react';
import classnames from 'classnames';
import { useEditor } from '../hooks/useEditor';
import { EditorSidebarFile } from './EditorSidebarFile';

export interface EditorSidebarProps {
  readonly basePath?: string;
  readonly className?: string;
}

/**
 * @description Sidebar component displaying the file tree for the editor.
 */
export const EditorSidebar = (
  props: EditorSidebarProps,
): React.ReactElement => {
  const { basePath = '/prompts', className } = props;

  // Hooks
  const { filteredFiles } = useEditor({ basePath });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames(
        'w-[220px] text-xs overflow-ellipsis',
        'flex flex-col gap-0.5 p-4',
        'border-l border-gray-700',
        className,
      )}
      data-testid="EditorSidebar"
      style={{
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      }}
    >
      {filteredFiles.length === 0 ? (
        <div className="py-4 text-center text-gray-500">No files found</div>
      ) : (
        filteredFiles.map((file) => (
          <EditorSidebarFile
            basePath={basePath}
            filename={file.filename}
            id={file.id}
            key={file.id ?? file.filename}
          />
        ))
      )}
    </div>
  );
};
