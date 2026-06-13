import * as React from 'react';
import classnames from 'classnames';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { isHiddenFile } from '../utils';

export interface EditorSidebarDirectoryProps {
  readonly children?: React.ReactNode;
  readonly depth?: number;
  readonly directory: string;
}

/**
 * @description Directory item in the editor sidebar with expandable children.
 */
export const EditorSidebarDirectory = (
  props: EditorSidebarDirectoryProps,
): React.ReactElement => {
  const { children, depth = 0, directory } = props;

  // Hooks
  const [isOpen, setIsOpen] = React.useState(false);

  // Setup
  const isHidden = isHiddenFile(directory);
  const Icon = isOpen ? CaretDownIcon : CaretRightIcon;

  // Handlers
  const toggleOpen = (): void => {
    setIsOpen(!isOpen);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="EditorSidebarDirectory">
      <div
        className={classnames(
          'flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1',
          'transition-colors hover:bg-white/10',
          {
            'text-gray-500': isHidden,
          },
        )}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggleOpen();
          }
        }}
        role="button"
        style={{ marginLeft: `${depth * 16}px` }}
        tabIndex={0}
      >
        <Icon size={12} weight={isOpen ? 'bold' : 'regular'} />
        {directory}
      </div>
      {isOpen && children && (
        <div style={{ marginLeft: `${(depth + 1) * 16}px` }}>{children}</div>
      )}
    </div>
  );
};
