import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToggleGroup, type ToggleGroupProps } from './ToggleGroup';
import { ToggleGroupItem } from './ToggleGroupItem';

const SIZES: readonly NonNullable<ToggleGroupProps['size']>[] = [
  'xs',
  'sm',
  'default',
  'lg',
];

const VARIANTS: readonly NonNullable<ToggleGroupProps['variant']>[] = [
  'default',
  'outline',
];

/**
 * Like `Accordion`, the root's props are a discriminated union on `type`, so
 * each story supplies its own `args` — `single` takes a string `value`,
 * `multiple` takes an array. That is also why `ToggleGroupProps` is an exported
 * `type` rather than an `interface`: a union cannot be `extend`ed.
 *
 * `size` and `variant` are passed on the ROOT and reach the items through
 * context, so the matrices below vary the root rather than each item.
 */
const meta: Meta<typeof ToggleGroup> = {
  component: ToggleGroup,
  parameters: { controls: { disable: true } },
  title: 'Components/ToggleGroup',
};

export default meta;

type Story = StoryObj<typeof ToggleGroup>;

export const Default: Story = {
  args: { defaultValue: 'bold', type: 'single' },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
      <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
    </ToggleGroup>
  ),
};

/** `type="multiple"` keeps several items pressed at once. */
export const Multiple: Story = {
  args: { defaultValue: ['bold', 'underline'], type: 'multiple' },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
      <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const VariantMatrix: Story = {
  args: { type: 'single' },
  render: () => (
    <div className="flex flex-col gap-6">
      {VARIANTS.map((variant) => (
        <div className="flex flex-col gap-2" key={variant}>
          <span className="text-muted-foreground text-xs font-medium">
            {variant}
          </span>
          <div className="flex flex-wrap items-center gap-4">
            {SIZES.map((size) => (
              <ToggleGroup
                defaultValue="bold"
                key={size}
                size={size}
                type="single"
                variant={variant}
              >
                <ToggleGroupItem value="bold">B</ToggleGroupItem>
                <ToggleGroupItem value="italic">I</ToggleGroupItem>
              </ToggleGroup>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

export const WithDisabledItem: Story = {
  args: { type: 'single' },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
      <ToggleGroupItem disabled={true} value="italic">
        Italic
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};
