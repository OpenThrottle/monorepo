import * as React from 'react';
import { useSearchParams } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@openthrottle/react-router-shadcn';

export interface <%= name %>Props {}

export const <%= name %> = (
  _props: <%= name %>Props,
): React.ReactElement => {
  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const isOpen = searchParams.get('modal') === <%= name %>.id;

  // Handlers
  // Radix drives open state through a single `onOpenChange`; the modal is
  // closed by dropping the search param that opened it.
  const onOpenChange = (open: boolean) => {
    if (open) return;

    const params = new URLSearchParams(searchParams);

    params.delete('modal');
    setSearchParams(params, { preventScrollReset: true });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent
        className="flex max-h-[90vh] w-full flex-col md:w-auto md:min-w-[360px]"
        data-testid="<%= name %>"
      >
        {/* TODO: Fill in the gaps */}
        <DialogHeader>
          <DialogTitle><%= name %></DialogTitle>
          <DialogDescription>
            Describe what this modal is for.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

<%= name %>.id = '<%= nameKebab %>';
