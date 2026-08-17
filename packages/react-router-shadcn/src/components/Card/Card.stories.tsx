import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button';
import { Card } from './Card';
import { CardAction } from './CardAction';
import { CardContent } from './CardContent';
import { CardDescription } from './CardDescription';
import { CardFooter } from './CardFooter';
import { CardHeader } from './CardHeader';
import { CardTitle } from './CardTitle';

const meta = {
  component: Card,
  parameters: { controls: { disable: true } },
  title: 'Components/Card',
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `Card` is a compound family: the root is a surface, and every part
 * (`CardHeader`, `CardTitle`, `CardAction`, …) is a separate export. Showing
 * the root alone would document almost nothing, so the default here is the
 * whole family composed the way apps use it.
 */
export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Deploy to production</CardTitle>
        <CardDescription>
          This promotes the current preview build. It cannot be undone from
          here.
        </CardDescription>
        <CardAction>
          <Button size="sm" variant="ghost">
            Docs
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Nine checks passed. The last deploy was three hours ago.
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};

/** The minimum useful composition — a title and a body, no footer or action. */
export const HeaderAndContentOnly: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Build 4821</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Queued behind two other builds.</p>
      </CardContent>
    </Card>
  ),
};

/**
 * `CardAction` is grid-placed by `CardHeader` into a trailing column, so it
 * stays aligned with the title regardless of how long the description wraps.
 */
export const WithLongDescription: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Retention policy</CardTitle>
        <CardDescription>
          Artifacts older than thirty days are pruned nightly. Builds that are
          still referenced by an open pull request are kept until that pull
          request closes, even when they fall outside the window.
        </CardDescription>
        <CardAction>
          <Button size="icon-sm" variant="ghost">
            ⋯
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  ),
};
