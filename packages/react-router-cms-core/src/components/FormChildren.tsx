import { Button, cn } from '@openthrottle/react-router-shadcn';
import { CodeSimpleIcon } from '@phosphor-icons/react/dist/ssr/CodeSimple';
import { PencilIcon } from '@phosphor-icons/react/dist/ssr/Pencil';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import * as React from 'react';
import { Link } from 'react-router';

import { FORM_CHILDREN_COPY } from '../data/data.copy';
import type { CmsFragmentRecord } from '../types/cms-records';
import type { CmsFormChildren } from '../types/cms-render';
import { ReorderGroup } from './ReorderGroup';

/**
 * @public
 */
export interface FormChildrenProps extends CmsFormChildren {
  readonly className: string | undefined;
}

/**
 * @description The child fragments of the fragment being edited: drag to reorder, edit or remove
 * each, or add more. Needs a `DndProvider` above it, like {@link ReorderGroup}.
 * @public
 */
export const FormChildren = (props: FormChildrenProps): React.ReactElement => {
  const {
    addHref,
    className,
    fragments,
    getFragmentHref,
    onRemove,
    onReorder,
  } = props;

  // Hooks

  // Setup

  // Handlers
  const onClickRemove = (fragment: CmsFragmentRecord) => {
    return (): void => {
      onRemove(fragment);
    };
  };

  // Markup
  const empty = (
    <p className="text-muted-foreground px-4 text-sm">
      {FORM_CHILDREN_COPY.empty}
    </p>
  );

  const renderItem = (fragment: CmsFragmentRecord): React.ReactNode => {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="truncate">{fragment.name || fragment.typename}</p>
        <div className="flex items-center">
          <Button asChild={true} size="icon" variant="ghost">
            <Link
              aria-label={FORM_CHILDREN_COPY.edit}
              to={getFragmentHref(fragment)}
            >
              <PencilIcon size={20} weight="light" />
            </Link>
          </Button>
          <Button
            aria-label={FORM_CHILDREN_COPY.remove}
            onClick={onClickRemove(fragment)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <TrashIcon size={20} weight="light" />
          </Button>
        </div>
      </div>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('flex flex-col gap-4 py-4', className)}>
      {fragments.length === 0 && empty}
      <ReorderGroup<CmsFragmentRecord>
        className="px-4"
        getItemId={(fragment) => fragment.uuid}
        renderItem={renderItem}
        source={{ items: fragments, kind: 'controlled', onReorder }}
      />
      <div className="px-4">
        <Button asChild={true} className="w-full" variant="outline">
          <Link to={addHref}>
            <CodeSimpleIcon />
            {FORM_CHILDREN_COPY.add}
          </Link>
        </Button>
      </div>
    </div>
  );
};
