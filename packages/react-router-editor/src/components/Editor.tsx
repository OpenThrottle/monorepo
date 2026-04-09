import * as React from 'react';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import type { EditorProps as MonacoEditorProps } from '@monaco-editor/react';
import { EditorSidebar } from './EditorSidebar';
import { EditorTabs } from './EditorTabs';
import { EditorToolbar } from './EditorToolbar';
import { EditorWindow } from './EditorWindow';

export interface EditorProps extends MonacoEditorProps {
  readonly basePath?: string;
  readonly onFileCreated?: (filename: string) => void;
  readonly showSidebar?: boolean;
  readonly showTabs?: boolean;
  readonly showToolbar?: boolean;
  readonly title?: string;
}

/**
 * @description Main editor component combining toolbar, tabs, editor window, and sidebar.
 */
export const Editor = (props: EditorProps) => {
  const {
    basePath = '/prompts',
    onFileCreated,
    showSidebar = true,
    showTabs = true,
    showToolbar = true,
    title = 'Custom Prompts',
    ...editorProps
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!IS_BROWSER) return null;

  return (
    <div className="flex flex-col flex-1" data-testid="Editor">
      {showToolbar && (
        <EditorToolbar
          basePath={basePath}
          onFileCreated={onFileCreated}
          title={title}
        />
      )}

      <div className="flex flex-1">
        <div className="flex flex-col flex-1 w-full">
          {showTabs && <EditorTabs basePath={basePath} />}
          <div className="flex-1">
            <EditorWindow {...editorProps} className="h-full" />
          </div>
        </div>
        {showSidebar && <EditorSidebar basePath={basePath} />}
      </div>
    </div>
  );
};
