import * as React from 'react';
import { Button, Markdown } from '@openthrottle/react-router-shadcn';

export interface GlobalErrorBoundaryStackToggleProps {
  readonly stack?: string;
}

/**
 * @description Collapsible "Show stack trace" control used by the
 * `GlobalErrorBoundary` JavaScript and unknown-error branches. Rendering is
 * gated by the caller (stack-toggle eligibility); this component only owns the
 * open/closed state.
 */
export const GlobalErrorBoundaryStackToggle = (
  props: GlobalErrorBoundaryStackToggleProps,
): React.ReactElement => {
  const { stack } = props;

  // Hooks
  const [showStack, setShowStack] = React.useState(false);

  // Setup

  // Handlers
  const onToggleStack = () => {
    setShowStack((v) => !v);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="mt-6 space-y-2"
      data-testid="GlobalErrorBoundaryStackToggle"
    >
      <Button onClick={onToggleStack} type="button" variant="secondary">
        {showStack ? 'Hide stack trace' : 'Show stack trace'}
      </Button>
      {showStack ? (
        <>
          <h2 className="text-subtitle my-4">Stack trace</h2>
          <Markdown content={stack} />
        </>
      ) : null}
    </div>
  );
};
