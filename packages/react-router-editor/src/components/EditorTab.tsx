import * as React from 'react';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import classnames from 'classnames';
import { Link, useParams, useSearchParams } from 'react-router';
import { useEditor } from '../hooks/useEditor';

export interface EditorTabProps {
  readonly basePath?: string;
  readonly className?: string;
  readonly filename: string;
  readonly onReorder: (draggedFilename: string, targetFilename: string) => void;
}

/**
 * @description Individual tab component representing an open file in the editor.
 */
export const EditorTab = (props: EditorTabProps): React.ReactElement => {
  const { basePath = '/prompts', className, filename, onReorder } = props;

  // Hooks
  const [isDragging, setIsDragging] = React.useState(false);
  const [searchParams] = useSearchParams();
  const params = useParams();
  const { closeFile } = useEditor({ basePath });

  // Setup
  const currentFilename = params['*'] ?? params.filename;
  const isActive = currentFilename === filename;
  const newParams = new URLSearchParams(searchParams);

  if (!isActive) {
    newParams.set('filename', filename);
  }

  const encodedFilename = encodeURIComponent(filename);

  // Handlers
  const onClickClose = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    closeFile(filename);
  };

  const onDragStart = (event: React.DragEvent<HTMLAnchorElement>): void => {
    event.dataTransfer.setData('text/plain', filename);
    event.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const onDragEnd = (): void => {
    setIsDragging(false);
  };

  const onDragOver = (event: React.DragEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: React.DragEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    const draggedFilename = event.dataTransfer.getData('text/plain');

    if (draggedFilename && draggedFilename !== filename) {
      onReorder(draggedFilename, filename);
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Link
      className={classnames(
        'group cursor-pointer p-2 pl-4 text-xs',
        'flex items-center justify-between gap-1',
        'hover:bg-gray-100/15',
        {
          'bg-gray-100/20': isActive,
          'border-color-primary border-t': isActive,
          'opacity-50': isDragging,
        },
        className,
      )}
      data-testid="EditorTab"
      draggable={true}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
      style={{ fontFamily: 'Menlo, Monaco, "Courier New", monospace' }}
      to={`${basePath}/${encodedFilename}`}
    >
      {filename}
      <button
        className={classnames(
          'cursor-pointer rounded-md p-1 hover:bg-white/10',
          'border border-transparent',
          'group-hover:ui-border-dark',
        )}
        onClick={onClickClose}
        type="button"
      >
        <XIcon size={12} />
      </button>
    </Link>
  );
};
