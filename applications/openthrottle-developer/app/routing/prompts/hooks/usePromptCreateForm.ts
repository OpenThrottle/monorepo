import * as React from 'react';
import { useFetcher } from 'react-router';
import type { PromptType } from '@openthrottle/react-router-editor';
import { PROMPTS_DEFAULT_CONTENT } from '~/routing/prompts/config';

export interface UsePromptCreateFormResult {
  canSubmit: boolean;
  content: string;
  description: string;
  filePath: string;
  handleEditorChange: (value: string | undefined) => void;
  handleSubmit: () => void;
  isSubmitting: boolean;
  labels: string;
  promptType: PromptType;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  setFilePath: React.Dispatch<React.SetStateAction<string>>;
  setLabels: React.Dispatch<React.SetStateAction<string>>;
  setPromptType: React.Dispatch<React.SetStateAction<PromptType>>;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  title: string;
}

/**
 * @description Draft state, submit/editor handlers, and the ⌘S save-shortcut
 * effect for the create-prompt form. Extracted from the route Component per
 * route-primitive-shape R4 so the route file stays a thin adapter.
 */
export const usePromptCreateForm = (): UsePromptCreateFormResult => {
  const fetcher = useFetcher();
  const [content, setContent] = React.useState(PROMPTS_DEFAULT_CONTENT);
  const [description, setDescription] = React.useState('');
  const [filePath, setFilePath] = React.useState('');
  const [labels, setLabels] = React.useState('');
  const [promptType, setPromptType] = React.useState<PromptType>('prompts');
  const [title, setTitle] = React.useState('');

  const isSubmitting = fetcher.state === 'submitting';
  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  const handleEditorChange = (value: string | undefined): void => {
    setContent(value ?? '');
  };

  const handleSubmit = React.useCallback((): void => {
    if (!canSubmit || isSubmitting) return;

    const formData = new FormData();

    formData.set('title', title.trim());
    formData.set('content', content);
    formData.set('promptType', promptType);

    if (description.trim()) {
      formData.set('description', description.trim());
    }

    if (labels.trim()) {
      formData.set('labels', labels.trim());
    }

    if (filePath.trim()) {
      formData.set('filePath', filePath.trim());
    }

    fetcher.submit(formData, { method: 'post' });
  }, [
    canSubmit,
    content,
    description,
    fetcher,
    filePath,
    isSubmitting,
    labels,
    promptType,
    title,
  ]);

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    canSubmit,
    content,
    description,
    filePath,
    handleEditorChange,
    handleSubmit,
    isSubmitting,
    labels,
    promptType,
    setDescription,
    setFilePath,
    setLabels,
    setPromptType,
    setTitle,
    title,
  };
};
