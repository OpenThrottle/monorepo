import type { Meta, StoryObj } from '@storybook/react-vite';
import { InlineErrors } from './InlineErrors';

const meta = {
  args: { errors: ['Password is required.'] },
  component: InlineErrors,
  title: 'Components/InlineErrors',
} satisfies Meta<typeof InlineErrors>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = {
  args: {
    errors: [
      'Password is required.',
      'Password must be at least 12 characters.',
      'Password must contain a number.',
    ],
    heading: 'Fix the following',
  },
};

/**
 * Falsy and empty-string entries are filtered before render, so the common
 * `condition && 'message'` pattern is safe to pass straight through.
 */
export const FiltersFalsyEntries: Story = {
  args: { errors: [null, undefined, false, '', 'Only this one renders.'] },
};

/**
 * With nothing left after filtering the component renders `null` — not an
 * empty bordered box. The canvas below is intentionally blank.
 */
export const RendersNothingWhenEmpty: Story = {
  args: { errors: [null, undefined, false, ''] },
};
