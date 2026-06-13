import * as React from 'react';
import { NotebookTextIcon } from 'lucide-react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';

export interface NotesIntroductionProps {}

export const NotesIntroduction = (
  _props: NotesIntroductionProps,
): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={NotebookTextIcon}
        title="Notes"
      />
      <p className="text-muted-foreground text-sm">
        Notes are a collection of unstructured thoughts and ideas.
      </p>
    </div>
  );
};
