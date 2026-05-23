import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '../utils/cn';

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'text-muted-foreground text-xs leading-none',
        'flex items-center gap-2 select-none',
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      data-slot="label"
      {...props}
    />
  );
}

export { Label };
