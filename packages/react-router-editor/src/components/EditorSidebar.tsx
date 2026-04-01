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
export const EditorSidebar = (props: EditorSidebarProps) => {
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
        'overflow-ellipsis text-xs w-[220px]',
        'p-4 flex flex-col gap-0.5',
        'border-l border-gray-700',
        className,
      )}
      data-testid="EditorSidebar"
      style={{
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      }}
    >
      {filteredFiles.length === 0 ? (
        <div className="text-gray-500 text-center py-4">No files found</div>
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
