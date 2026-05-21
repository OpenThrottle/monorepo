import { cva } from 'class-variance-authority';

export const toggleGroupItemVariants = cva(
  'cursor-pointer ' +
    'inline-flex items-center justify-center ' +
    'rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ',
  {
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
    variants: {
      size: {
        default: 'h-10 px-3',
        lg: 'h-11 px-5',
        sm: 'h-9 px-2.5',
        xs: 'h-6 px-1.5 text-xs',
      },
      variant: {
        default: `bg-transparent hover:bg-accent hover:text-accent-foreground`,
        outline: `border border-input bg-transparent hover:bg-accent hover:text-accent-foreground`,
      },
    },
  },
);
