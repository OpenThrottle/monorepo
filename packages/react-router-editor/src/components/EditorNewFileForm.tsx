import * as React from 'react';
import classnames from 'classnames';
import { useFetcher } from 'react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { PROMPT_TYPE_OPTIONS, PROMPT_TYPE_VALUES } from '../config';
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
): React.ReactElement | null => {
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

  const handleTypeChange = (value: string): void => {
    const nextType = PROMPT_TYPE_VALUES.find((type) => type === value);

    if (nextType) {
      setPromptType(nextType);
    }
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
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={classnames(
        'border-b border-gray-700 bg-gray-800 p-4',
        className,
      )}
      data-testid="EditorNewFileForm"
    >
      <div className="mb-2">
        <label className="mb-1 block text-sm font-medium" htmlFor="filename">
          Filename (with extension)
          <span className="ml-2 text-xs text-gray-500">
            Enter to create, Esc to cancel
          </span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            autoFocus={true}
            className={classnames(
              'w-full rounded-md px-3 py-2 text-sm',
              'border border-gray-700 bg-gray-900',
              'focus:border-blue-500 focus:outline-none',
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

        <Select onValueChange={handleTypeChange} value={promptType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROMPT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <button
            className={classnames(
              'rounded-md px-3 py-2 text-sm',
              'bg-gray-700 transition-colors hover:bg-gray-600',
            )}
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={classnames(
              'rounded-md px-3 py-2 text-sm',
              'bg-blue-600 transition-colors hover:bg-blue-700',
              'disabled:cursor-not-allowed disabled:opacity-50',
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
