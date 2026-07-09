import * as React from 'react';
import clsx from 'clsx';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronDownIcon, ChevronUpIcon, LucideIcon } from 'lucide-react';
import { GlobalHeading } from './GlobalHeading';

export interface GlobalCollapsibleProps extends React.PropsWithChildren {
  readonly className?: string;
  readonly icon?: LucideIcon;
  readonly open?: boolean;
  readonly title: string;
}

export const GlobalCollapsible = (
  props: GlobalCollapsibleProps,
): React.ReactElement => {
  const { children, className, icon, open = true, title } = props;

  // Hooks
  const [isOpen, setIsOpen] = React.useState(open);

  // Setup
  const Icon = isOpen ? ChevronUpIcon : ChevronDownIcon;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx(className)} data-testid="GlobalCollapsible">
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <GlobalHeading
          className="p-4 text-xl font-semibold"
          heading="h2"
          icon={icon}
          title={title}
        >
          <CollapsibleTrigger asChild={true}>
            <Button size="sm" variant="ghost">
              <Icon className="size-6" />
            </Button>
          </CollapsibleTrigger>
        </GlobalHeading>
        <CollapsibleContent className="mt-4">{children}</CollapsibleContent>
      </Collapsible>
    </div>
  );
};
