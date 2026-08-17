import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, type ButtonProps } from './Button';

/**
 * `cva()` returns a bare class-building function — it does not expose its
 * variant map at runtime — so the matrix lists are declared here and typed
 * against the component's own props. An invalid value is a type error; the
 * exhaustive list of valid ones is what the Controls `select` shows, and that
 * comes from docgen off `ButtonProps`, not from these arrays.
 */
const SIZES: readonly NonNullable<ButtonProps['size']>[] = [
  'xs',
  'sm',
  'default',
  'lg',
  'icon-xs',
  'icon-sm',
  'icon',
  'icon-lg',
];

const VARIANTS: readonly NonNullable<ButtonProps['variant']>[] = [
  'default',
  'brand',
  'secondary',
  'destructive',
  'outline',
  'ghost',
  'link',
];

const meta = {
  /**
   * The `cva` unions reach docgen as an opaque string type, so the select
   * controls are declared rather than inferred. The prop TABLE on the Docs
   * page still comes from docgen off `ButtonProps`.
   */
  argTypes: {
    asChild: { control: 'boolean' },
    size: { control: 'select', options: SIZES },
    variant: { control: 'select', options: VARIANTS },
  },
  args: {
    children: 'Button',
    disabled: false,
    size: 'default',
    variant: 'default',
  },
  component: Button,
  title: 'Components/Button',
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Every `variant` x `size` combination at a glance, so a regression in any one
 * of them is visible without clicking through the controls.
 */
export const VariantMatrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-6">
      {VARIANTS.map((variant) => (
        <div className="flex flex-col gap-2" key={variant}>
          <span className="text-muted-foreground text-xs font-medium">
            {variant}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {SIZES.map((size) => (
              <Button key={size} size={size} variant={variant}>
                {size}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Destructive: Story = {
  args: { children: 'Delete', size: 'lg', variant: 'destructive' },
};

export const Disabled: Story = {
  args: { children: 'Unavailable', disabled: true },
};
