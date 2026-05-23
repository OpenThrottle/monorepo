import * as React from 'react';
import MonacoEditor from '@monaco-editor/react';
import type { EditorProps as MonacoEditorProps } from '@monaco-editor/react';
import { IS_BROWSER } from '@openthrottle/react-router-utils';
import { EDITOR_DEFAULTS } from '../config';

export interface EditorWindowProps extends MonacoEditorProps {
  readonly className?: string;
}

/**
 * @description Monaco editor wrapper component with sensible defaults for prompt editing.
 */
export const EditorWindow = (
  props: EditorWindowProps,
): React.ReactElement | null => {
  const { className, ...rest } = props;

  // Hooks

  // Setup
  const mergedOptions = {
    ...EDITOR_DEFAULTS,
    ...rest.options,
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!IS_BROWSER) {
    return null;
  }

  return (
    <MonacoEditor
      {...rest}
      className={className}
      options={mergedOptions}
      theme={EDITOR_DEFAULTS.theme}
    />
  );
};
