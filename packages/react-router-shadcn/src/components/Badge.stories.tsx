import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, type BadgeProps } from './Badge';

/**
 * `cva()` does not expose its variant map at runtime, so these lists are
 * declared rather than derived. They are typed against the component's own
 * props: an invalid option is a type error. The exhaustive list of valid ones
 * shows up in the Docs API table, which docgen reads off `BadgeProps`.
 */
const COLORS: readonly NonNullable<BadgeProps['color']>[] = [
  'accent',
  'amber',
  'blue',
  'default',
  'green',
  'lime',
  'orange',
  'red',
  'sky',
  'slate',
  'violet',
  'yellow',
];
const SIZES: readonly NonNullable<BadgeProps['size']>[] = [
  '2xl',
  '3xl',
  'default',
  'lg',
  'sm',
  'xl',
  'xs',
];
const VARIANTS: readonly NonNullable<BadgeProps['variant']>[] = [
  'default',
  'destructive',
  'ghost',
  'link',
  'outline',
  'secondary',
];

const meta = {
  argTypes: {
    color: { control: 'select', options: COLORS },
    size: { control: 'select', options: SIZES },
    variant: { control: 'select', options: VARIANTS },
  },
  args: { children: 'Badge' },
  component: Badge,
  title: 'Components/Badge',
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Every `color` x `size` combination, so a regression in any one
 * of them is visible without clicking through the controls.
 *
 * Groups beyond the first two (variant) are exercised through the
 * controls rather than the grid — add a dedicated story if one needs pinning.
 */
export const VariantMatrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-6">
      {COLORS.map((color) => (
        <div className="flex flex-col gap-2" key={color}>
          <span className="text-muted-foreground text-xs font-medium">
            {color}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {SIZES.map((size) => (
              <Badge color={color} key={size} size={size}>
                {size}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
