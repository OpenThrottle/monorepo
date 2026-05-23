import * as React from 'react';
import classnames from 'classnames';
import { useFetcher } from 'react-router';
import { PROMPT_TYPE_OPTIONS } from '../config';
import type { PromptType } from '../config';
import { getFilenameError, validateFilename } from '../utils';

export interface EditorNewFileFormProps {
  readonly basePath?: string;
  readonly className?: string;
  readonly isVisible: boolean;
  readonly onCancel: () => void;
  readonly onSuccess: (filename: string) => void;
}

interface FetcherData {
  readonly filename?: string;
  readonly message: string;
  readonly success: boolean;
}

/**
 * @description Form component for creating new prompt files.
 */
export const EditorNewFileForm = (
  props: EditorNewFileFormProps,
): React.ReactElement => {
  const {
    basePath = '/prompts',
    className,
    isVisible,
    onCancel,
    onSuccess,
  } = props;

  // Hooks
  const [filename, setFilename] = React.useState('');
  const [promptType, setPromptType] = React.useState<PromptType>('prompts');
  const [error, setError] = React.useState<string>('');
  const fetcher = useFetcher<FetcherData>();
  const lastProcessedDataRef = React.useRef<FetcherData | null>(null);

  // Setup
  const filenameValid = validateFilename(filename);
  const isSubmitting = fetcher.state === 'submitting';
  const isDisabled = isSubmitting || !filenameValid;

  // Handlers
  const handleCreateFile = (): void => {
    if (!filenameValid) {
      const errorMessage = getFilenameError(filename);
      setError(errorMessage);
      return;
    }

    setError('');

    const formData = new FormData();
    formData.append('_action', 'createFile');
    formData.append('filename', filename.trim());
    formData.append('promptType', promptType);

    fetcher.submit(formData, { action: basePath, method: 'POST' });
  };

  const handleCancel = (): void => {
    setFilename('');
    setError('');
    onCancel();
  };

  const handleFilenameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setFilename(e.target.value);
    setError('');
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    // FIXME: Tighten this up

    setPromptType(e.target.value as PromptType);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (
      fetcher.data &&
      'message' in fetcher.data &&
      fetcher.data !== lastProcessedDataRef.current
    ) {
      lastProcessedDataRef.current = fetcher.data;

      const data = fetcher.data;

      if (data.success && data.filename) {
        onSuccess(data.filename);
        setFilename('');
        setError('');
      } else {
        setError(data.message);
      }
    }
  }, [fetcher.data, onSuccess]);

  // 🔌 Short Circuit
  if (!isVisible) return null;

  return (
    <div
      className={classnames(
        'p-4 border-b border-gray-700 bg-gray-800',
        className,
      )}
      data-testid="EditorNewFileForm"
    >
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1" htmlFor="filename">
          Filename (with extension)
          <span className="text-xs text-gray-500 ml-2">
            Enter to create, Esc to cancel
          </span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            autoFocus={true}
            className={classnames(
              'w-full px-3 py-2 text-sm rounded-md',
              'bg-gray-900 border border-gray-700',
              'focus:outline-none focus:border-blue-500',
              'placeholder:text-gray-500',
              {
                'border-red-500': error,
              },
            )}
            id="filename"
            onChange={handleFilenameChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateFile();
              }
              if (e.key === 'Escape') {
                handleCancel();
              }
            }}
            placeholder="e.g., my-custom-prompt.md, agents.mdc"
            value={filename}
          />
        </div>

        <select
          className={classnames(
            'px-3 py-2 text-sm rounded-md',
            'bg-gray-900 border border-gray-700',
            'focus:outline-none focus:border-blue-500',
          )}
          onChange={handleTypeChange}
          value={promptType}
        >
          {PROMPT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            className={classnames(
              'px-3 py-2 text-sm rounded-md',
              'bg-gray-700 hover:bg-gray-600 transition-colors',
            )}
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={classnames(
              'px-3 py-2 text-sm rounded-md',
              'bg-blue-600 hover:bg-blue-700 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            disabled={isDisabled}
            onClick={handleCreateFile}
            type="button"
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
    </div>
  );
};
