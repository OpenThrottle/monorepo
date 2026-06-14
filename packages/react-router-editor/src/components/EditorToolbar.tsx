import * as React from 'react';
import classnames from 'classnames';
import { FileIcon } from '@phosphor-icons/react/dist/ssr/File';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
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
export const EditorToolbar = (
  props: EditorToolbarProps,
): React.ReactElement => {
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

  const handleTypeChange = (value: string): void => {
    // FIXME: Tighten this up

    const type = value as PromptType | '';

    setSelectedType(type || undefined);
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
          'flex items-center justify-between border-b border-gray-700 bg-gray-900 p-4',
          className,
        )}
        data-testid="EditorToolbar"
      >
        <h1 className="text-lg">{title}</h1>

        <div className="flex items-center gap-4">
          <Input
            onChange={handleSearchChange}
            placeholder="Search prompts..."
            type="search"
            value={searchQuery}
          />

          {/* Type Filter */}
          <Select onValueChange={handleTypeChange} value={selectedType ?? ''}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {PROMPT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Keyboard Shortcut Hint */}
          <span className="text-xs whitespace-nowrap text-gray-500">
            Ctrl + N
          </span>

          {/* New File Button */}
          <Button
            onClick={() => setShowCreateForm(true)}
            size="sm"
            variant="outline"
          >
            <FileIcon size={16} weight="fill" />
            New Prompt
          </Button>
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
