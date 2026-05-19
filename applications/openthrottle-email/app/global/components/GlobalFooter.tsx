import * as React from 'react';

/**
 * @deprecated Commented out in root layout; kept for intentional rollback. See root.tsx.
 */

export interface GlobalFooterProps {}

export const GlobalFooter = (_props: GlobalFooterProps) => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <footer
      className="border-t border-border bg-card sm:px-6 lg:px-8"
      data-testid="GlobalFooter"
    >
      <div className="border-t border-border p-8 text-center text-sm text-muted-foreground">
        <p>Built by engineers. Open source. No lock-in.</p>
      </div>
    </footer>
  );
};
