import * as React from 'react';
import { Dialog, DialogContent } from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';

export interface GlobalModalProps extends React.PropsWithChildren {
  readonly param: string;
  readonly value: string;
}

export const GlobalModal = (props: GlobalModalProps) => {
  const { children, param: paramProp = 'modal', value } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  const param = searchParams.get(paramProp);
  const isOpen = param === value;

  // Handlers
  const onToggle = () => {
    const newParams = new URLSearchParams(searchParams);

    if (isOpen) newParams.delete(paramProp);
    if (!isOpen) newParams.set(paramProp, value);

    setSearchParams(newParams, { preventScrollReset: true });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={onToggle} open={isOpen}>
      <DialogContent className="sm:max-w-sm data-[state=closed]:slide-out-to-top-[0%] ">
        {children}
      </DialogContent>
    </Dialog>
  );
};

GlobalModal.key = 'daily-stats';
