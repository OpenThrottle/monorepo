import { cva, type VariantProps } from 'class-variance-authority';

export type BadgeVariants = VariantProps<typeof badgeVariants>;
export const badgeVariants = cva(
  'inline-flex text-center items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      size: {
        '2xl': 'text-2xl px-4 py-2',
        '3xl': 'text-3xl px-4 py-2',
        default: 'text-xs px-2 py-1',
        lg: 'text-lg px-3 py-2',
        sm: 'text-sm px-2 py-1',
        xl: 'text-xl px-4 py-2',
        xs: 'text-xs px-1.5 py-0.5',
      },
      variant: {
        default: `border-transparent bg-primary text-primary-foreground hover:bg-primary/80`,
        destructive: `border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80`,
        outline: 'text-foreground',
        secondary: `border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80`,
      },
    },
  },
);
