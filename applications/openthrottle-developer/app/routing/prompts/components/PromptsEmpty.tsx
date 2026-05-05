import * as React from 'react';
import classnames from 'classnames';

export interface PromptsEmptyProps {
  readonly className?: string;
}

export const PromptsEmpty = (props: PromptsEmptyProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('flex flex-col flex-1 justify-center', className)}
    >
      <div
        className="text-center py-12 text-muted-foreground"
        data-testid="prompts-empty"
      >
        <p className="text-lg">No prompts found.</p>
        <p className="mt-2">
          Create your first prompt to get started. For in-repo skill paths see
          Skills; for coarse portal workload see Usage.
        </p>
      </div>
    </div>
  );
};
