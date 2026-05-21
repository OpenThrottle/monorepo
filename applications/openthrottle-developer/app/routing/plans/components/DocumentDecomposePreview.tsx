import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import type { ProposedPlanDecomposition } from '~/routing/plans/types/document-decompose';

interface DocumentDecomposePreviewProps {
  readonly className?: string;
  readonly proposal: ProposedPlanDecomposition | undefined;
}

/**
 * @description Read-only preview of inferred plan title, tasks, and requirements before commit.
 */
export const DocumentDecomposePreview = (
  props: DocumentDecomposePreviewProps,
): React.ReactElement => {
  const { className, proposal } = props;

  if (!proposal) {
    return (
      <div
        className={classnames(
          'rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground',
          className,
        )}
        data-testid="DocumentDecomposePreview"
      >
        Parse a document to see a proposed plan and tasks here.
      </div>
    );
  }

  return (
    <div
      className={classnames('space-y-4', className)}
      data-testid="DocumentDecomposePreview"
    >
      <Card>
        <CardHeader>
          <CardTitle>{proposal.planTitle}</CardTitle>
          {proposal.planDescription !== undefined &&
          proposal.planDescription.trim() !== '' ? (
            <CardDescription className="whitespace-pre-wrap">
              {proposal.planDescription}
            </CardDescription>
          ) : null}
        </CardHeader>
      </Card>
      <ul className="space-y-3">
        {proposal.tasks.map((task, index) => (
          <li key={`${task.title}-${String(index)}`}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{task.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  Requirements
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {task.requirements.map((req, reqIndex) => (
                    <li key={`${task.title}-req-${String(reqIndex)}`}>{req}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
};
