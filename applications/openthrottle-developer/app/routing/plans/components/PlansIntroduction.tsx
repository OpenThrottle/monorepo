import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { ListChevronsUpDownIcon } from 'lucide-react';

export interface PlansIntroductionProps {
  readonly className?: string;
}

export const PlansIntroduction = (_props: PlansIntroductionProps) => {
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
        icon={ListChevronsUpDownIcon}
        title="Plans"
      />
      <p className="text-muted-foreground text-sm">
        Lorem ipsum dolor, sit amet consectetur adipisicing elit. Deserunt sequi
        doloremque consectetur repellat porro provident nesciunt nisi deleniti
        laborum distinctio, quod magni nemo quidem tenetur aliquid ut, sit
        repellendus perspiciatis?
      </p>
    </div>
  );
};
