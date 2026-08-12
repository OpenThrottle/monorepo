import * as React from 'react';
import { useFetcher } from 'react-router';
import { getLanguageFromExt } from '@openthrottle/react-router-editor';
import type { Route } from '@/app/routes/+types/prompts.$promptId';

type PromptDetail = Route.ComponentProps['loaderData']['prompt'];
type PromptEditorActionData = Route.ComponentProps['actionData'];

export interface UsePromptEditorResult {
  content: string;
  handleDelete: () => void;
  handleEditorChange: (value: string | undefined) => void;
  handleSave: () => void;
  handleWriteToFileSystem: () => void;
  isDirty: boolean;
  isSubmitting: boolean;
  language: ReturnType<typeof getLanguageFromExt>;
  statusText: string;
}

/**
 * @description Editor state, save/delete/write handlers, and keyboard/save-sync
 * effects for the prompt detail route. Extracted from the route Component per
 * route-primitive-shape R4 so the route file stays a thin adapter.
 */
export const usePromptEditor = (
  prompt: PromptDetail,
  actionData: PromptEditorActionData,
): UsePromptEditorResult => {
  const fetcher = useFetcher();
  const [content, setContent] = React.useState(prompt.content);
  const [isDirty, setIsDirty] = React.useState(false);

  const isSubmitting = fetcher.state === 'submitting';
  const extension = prompt.filePath?.split('.').pop() ?? 'md';
  const language = getLanguageFromExt(extension);

  const handleEditorChange = (value: string | undefined): void => {
    const newContent = value ?? '';
    setContent(newContent);
    setIsDirty(newContent !== prompt.content);
  };

  const handleSave = React.useCallback((): void => {
    if (!isDirty || isSubmitting) return;

    const formData = new FormData();
    formData.set('intent', 'update');
    formData.set('content', content);

    fetcher.submit(formData, { method: 'post' });
  }, [content, fetcher, isDirty, isSubmitting]);

  const handleWriteToFileSystem = (): void => {
    const formData = new FormData();
    formData.set('intent', 'writeToFileSystem');

    fetcher.submit(formData, { method: 'post' });
  };

  const handleDelete = (): void => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;

    const formData = new FormData();
    formData.set('intent', 'delete');

    fetcher.submit(formData, { method: 'post' });
  };

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  const statusText = React.useMemo(() => {
    if (isSubmitting) return 'Saving...';
    if (actionData?.error) return actionData.error;
    if (actionData?.success) return 'Saved';
    if (isDirty) return 'Unsaved changes';

    return '';
  }, [actionData, isDirty, isSubmitting]);

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  React.useEffect(() => {
    if (actionData?.success) {
      setIsDirty(false);
    }
  }, [actionData?.success]);

  return {
    content,
    handleDelete,
    handleEditorChange,
    handleSave,
    handleWriteToFileSystem,
    isDirty,
    isSubmitting,
    language,
    statusText,
  };
};
