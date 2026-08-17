import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  type ButtonGroupProps,
} from './ButtonGroup';

const ORIENTATIONS: readonly NonNullable<ButtonGroupProps['orientation']>[] = [
  'horizontal',
  'vertical',
];

const meta = {
  component: ButtonGroup,
  parameters: { controls: { disable: true } },
  title: 'Components/ButtonGroup',
} satisfies Meta<typeof ButtonGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The group does the seam work itself — child buttons keep their own variants
 * while the group strips the inner radii and doubled borders.
 */
export const Default: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Day</Button>
      <Button variant="outline">Week</Button>
      <Button variant="outline">Month</Button>
    </ButtonGroup>
  ),
};

export const Orientations: Story = {
  render: () => (
    <div className="flex items-start gap-8">
      {ORIENTATIONS.map((orientation) => (
        <div className="flex flex-col gap-2" key={orientation}>
          <span className="text-muted-foreground text-xs font-medium">
            {orientation}
          </span>
          <ButtonGroup orientation={orientation}>
            <Button variant="outline">Day</Button>
            <Button variant="outline">Week</Button>
            <Button variant="outline">Month</Button>
          </ButtonGroup>
        </div>
      ))}
    </div>
  ),
};

/** `ButtonGroupText` and `ButtonGroupSeparator` for a labelled segment. */
export const WithTextAndSeparator: Story = {
  render: () => (
    <ButtonGroup>
      <ButtonGroupText>Range</ButtonGroupText>
      <ButtonGroupSeparator />
      <Button variant="outline">7d</Button>
      <Button variant="outline">30d</Button>
    </ButtonGroup>
  ),
};
