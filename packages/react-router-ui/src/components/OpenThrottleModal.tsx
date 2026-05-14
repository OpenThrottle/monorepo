import * as React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
} from '@openthrottle/react-router-shadcn';
import type { DialogProps } from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';
import { XIcon } from 'lucide-react';

export interface OpenThrottleModalProps extends DialogProps {
  readonly param: string;
  readonly value: string;
}

export const OpenThrottleModal = (
  props: OpenThrottleModalProps,
): React.ReactElement => {
  const { param, value } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const isOpen = searchParams.get(param) === value;

  // Handlers
  const onToggle = () => {
    const newParams = new URLSearchParams(searchParams);

    newParams.set(param, value);

    setSearchParams(newParams);
  };

  const onClose = () => {
    const newParams = new URLSearchParams(searchParams);

    if (isOpen) newParams.delete(param);

    setSearchParams(newParams);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog
      data-testid="OpenThrottleModal"
      onOpenChange={onToggle}
      open={isOpen}
    >
      <DialogContent>
        <Button onClick={onClose}>
          <XIcon className="size-10" />
          <span className="sr-only">Close</span>
        </Button>
        <p className="text-muted-foreground">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Expedita quod
          minus est facilis ullam magni necessitatibus quis dolor numquam
          consectetur autem, rem incidunt fugiat at natus! Aperiam error labore
          eum.
        </p>
        {props.children}
      </DialogContent>
    </Dialog>
  );
};
