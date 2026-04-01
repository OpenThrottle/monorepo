import * as React from 'react';
import classnames from 'classnames';
import { FileIcon } from '@phosphor-icons/react/dist/ssr/File';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PROMPT_TYPE_OPTIONS } from '../config';
import type { PromptType } from '../config';
import { useEditor } from '../hooks/useEditor';
import { EditorNewFileForm } from './EditorNewFileForm';

export interface EditorToolbarProps {
  readonly basePath?: string;
  readonly className?: string;
  readonly onFileCreated?: (filename: string) => void;
  readonly title?: string;
}

/**
 * @description Toolbar component with search, filter, and new file actions.
 */
export const EditorToolbar = (props: EditorToolbarProps) => {
  const {
    basePath = '/prompts',
    className,
    onFileCreated,
    title = 'Custom Prompts',
  } = props;

  // Hooks
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const { editor, setSearchQuery, setSelectedType } = useEditor({ basePath });

  // Setup
  const { searchQuery, selectedType } = editor;

  // Handlers
  const handleFileCreated = (filename: string): void => {
    setShowCreateForm(false);
    onFileCreated?.(filename);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    // FIXME: Tighten this up
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const value = e.target.value as PromptType | '';
    setSelectedType(value || undefined);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
  };

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowCreateForm(true);
        return;
      }

      if (e.key === 'Escape' && showCreateForm) {
        e.preventDefault();
        setShowCreateForm(false);
        return;
      }
    },
    [showCreateForm],
  );

  // Markup

  // Life Cycle
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 🔌 Short Circuit

  return (
    <>
      <div
        className={classnames(
          'flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900',
          className,
        )}
        data-testid="EditorToolbar"
      >
        <h1 className="text-lg font-semibold">{title}</h1>

        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              className={classnames(
                'pl-8 pr-3 py-1.5 text-sm rounded-md',
                'bg-gray-800 border border-gray-700',
                'focus:outline-none focus:border-blue-500',
                'placeholder:text-gray-500',
              )}
              onChange={handleSearchChange}
              placeholder="Search prompts..."
              type="text"
              value={searchQuery}
            />
          </div>

          {/* Type Filter */}
          <select
            className={classnames(
              'px-3 py-1.5 text-sm rounded-md',
              'bg-gray-800 border border-gray-700',
              'focus:outline-none focus:border-blue-500',
            )}
            onChange={handleTypeChange}
            value={selectedType ?? ''}
          >
            <option value="">All Types</option>
            {PROMPT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>

          {/* Keyboard Shortcut Hint */}
          <span className="text-xs text-gray-500">Ctrl + N</span>

          {/* New File Button */}
          <button
            className={classnames(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md',
              'bg-blue-600 hover:bg-blue-700 transition-colors',
            )}
            onClick={() => setShowCreateForm(true)}
            type="button"
          >
            <FileIcon size={16} weight="fill" />
            New Prompt
          </button>
        </div>
      </div>

      <EditorNewFileForm
        basePath={basePath}
        isVisible={showCreateForm}
        onCancel={() => setShowCreateForm(false)}
        onSuccess={handleFileCreated}
      />
    </>
  );
};
