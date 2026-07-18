import * as React from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { Badge, Button, cn } from '@openthrottle/react-router-shadcn';
import { HOOK_LIST_COPY } from '~/routing/plans/data/data.copy';

/**
 * @description One lifecycle-hook (a materialized hook-task) as this list needs
 * it. Decoupled from the generated GraphQL fragment so the component is pure and
 * unit-testable; the route layer maps its fragment onto this shape.
 */
export interface HookTaskListItem {
  hookScope?: string | null;
  hookSource?: string | null;
  id: string;
  skillSlug?: string | null;
  title: string;
}

export interface HookTaskListProps {
  className?: string;
  hooks: HookTaskListItem[];
  onAdd?: () => void;
  onDetach: (hookTaskId: string) => void;
  role: 'after' | 'before';
}

/**
 * @description Renders one before/after group of lifecycle-hook tasks nested
 * under a plan or a task, visually separated from regular tasks (dashed, muted
 * container + "hook" badge), with per-hook remove and an add control. Purely
 * presentational — attach/detach are delegated to the caller's mutations.
 */
export const HookTaskList = (props: HookTaskListProps): React.ReactElement => {
  const { className, hooks, onAdd, onDetach, role } = props;

  // Hooks

  // Setup
  const title =
    role === 'before' ? HOOK_LIST_COPY.beforeTitle : HOOK_LIST_COPY.afterTitle;
  const addLabel =
    role === 'before' ? HOOK_LIST_COPY.addBefore : HOOK_LIST_COPY.addAfter;
  const emptyLabel =
    role === 'before' ? HOOK_LIST_COPY.emptyBefore : HOOK_LIST_COPY.emptyAfter;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label={`${title} hooks`}
      className={cn(
        'border-muted-foreground/30 bg-muted/30 flex flex-col gap-2 rounded-md border border-dashed p-3',
        className,
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <Badge size="xs" variant="outline">
            {HOOK_LIST_COPY.hookBadge}
          </Badge>
          <span className="text-muted-foreground text-xs">{hooks.length}</span>
        </div>
        {onAdd != null && (
          <Button
            aria-label={addLabel}
            onClick={onAdd}
            size="sm"
            type="button"
            variant="ghost"
          >
            <PlusIcon className="size-4" />
            {addLabel}
          </Button>
        )}
      </header>

      {hooks.length === 0 ? (
        <p className="text-muted-foreground text-xs italic">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {hooks.map((hook) => (
            <li
              className="bg-background flex items-center justify-between gap-2 rounded border px-2 py-1.5"
              key={hook.id}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm">{hook.title}</span>
                {hook.hookSource === 'skill' && hook.skillSlug != null && (
                  <Badge size="xs" variant="secondary">
                    /{hook.skillSlug}
                  </Badge>
                )}
                {hook.hookScope != null && (
                  <Badge size="xs" variant="outline">
                    {hook.hookScope}
                  </Badge>
                )}
              </div>
              <Button
                aria-label={`${HOOK_LIST_COPY.detach}: ${hook.title}`}
                onClick={() => onDetach(hook.id)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <XIcon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
