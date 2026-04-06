import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  CardContent,
  CardHeader,
} from '@openthrottle/react-router-shadcn';

export interface PlanTasksColumnProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly columnId: string;
  readonly droppableRef?: React.Ref<HTMLElement>;
  readonly emptyLabel?: string;
  readonly title: string;
}

/**
 * @description Single status column: header plus scrollable task cards with an empty state.
 */
export const PlanTasksColumn = (props: PlanTasksColumnProps) => {
  const {
    children,
    className,
    columnId,
    droppableRef,
    emptyLabel = 'No tasks',
    title,
  } = props;

  // Hooks

  // Setup
  const headingId = `plan-tasks-column-title-${columnId}`;
  const isEmpty = React.Children.count(children) === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby={headingId}
      className={classnames(
        'flex w-[min(100vw-2rem,320px)] shrink-0 flex-col',
        className,
      )}
      data-testid={`PlanTasksColumn-${columnId}`}
      ref={droppableRef}
      role="region"
    >
      <Card className="flex max-h-[min(70vh,560px)] min-h-[200px] flex-col overflow-hidden">
        <CardHeader className="shrink-0 space-y-0 pb-2 pt-3">
          <h3
            className="text-sm font-semibold leading-none tracking-tight"
            id={headingId}
          >
            {title}
          </h3>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 pt-0">
          {isEmpty ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {emptyLabel}
            </p>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </section>
  );
};
