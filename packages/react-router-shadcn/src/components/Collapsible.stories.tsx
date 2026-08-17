import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './Collapsible';

const meta = {
  component: Collapsible,
  parameters: { controls: { disable: true } },
  title: 'Components/Collapsible',
} satisfies Meta<typeof Collapsible>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The unstyled counterpart to `Accordion` — one disclosure, no item list and no
 * chrome of its own. Reach for it when you need show/hide without the accordion
 * look.
 */
export const Default: Story = {
  render: () => (
    <Collapsible className="w-96">
      <CollapsibleTrigger asChild={true}>
        <Button variant="outline">Toggle details</Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="py-2 text-sm">
          Nine checks passed. The last deploy was three hours ago.
        </p>
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const OpenByDefault: Story = {
  render: () => (
    <Collapsible className="w-96" defaultOpen={true}>
      <CollapsibleTrigger asChild={true}>
        <Button variant="outline">Toggle details</Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="py-2 text-sm">Visible on first render.</p>
      </CollapsibleContent>
    </Collapsible>
  ),
};
