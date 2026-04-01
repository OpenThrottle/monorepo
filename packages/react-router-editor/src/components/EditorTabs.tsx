import * as React from 'react';
import classnames from 'classnames';
import { useAtom } from 'jotai';
import { editorAtom } from '../data/atom.editor';
import { useEditor } from '../hooks/useEditor';
import type { EditorFile } from '../data/atom.editor';
import { EditorTab } from './EditorTab';

export interface EditorTabsProps {
  readonly basePath?: string;
  readonly className?: string;
}

/**
 * @description Container component for editor tabs with drag-and-drop reordering.
 */
export const EditorTabs = (props: EditorTabsProps) => {
  const { basePath = '/prompts', className } = props;

  // Hooks
  const [editor] = useAtom(editorAtom);
  const { reorderFiles } = useEditor({ basePath });

  // Setup
  const { tabs } = editor;

  // Handlers
  const onReorder = (draggedFilename: string, targetFilename: string): void => {
    const draggedIndex = tabs.findIndex(
      (file) => file.filename === draggedFilename,
    );

    const targetIndex = tabs.findIndex(
      (file) => file.filename === targetFilename,
    );

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newTabs: EditorFile[] = [...tabs];
    const draggedFile = newTabs[draggedIndex];

    if (!draggedFile) return;

    newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, draggedFile);

    reorderFiles(newTabs);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (tabs.length === 0) return null;

  return (
    <div
      className={classnames('flex mt-1 overflow-y-auto max-w-full', className)}
      data-testid="EditorTabs"
    >
      {tabs.map((file) => (
        <EditorTab
          basePath={basePath}
          filename={file.filename}
          key={file.filename}
          onReorder={onReorder}
        />
      ))}
    </div>
  );
};
