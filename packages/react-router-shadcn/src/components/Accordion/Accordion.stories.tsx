import type { Meta, StoryObj } from '@storybook/react-vite';
import { Accordion } from './index';
import { AccordionContent } from './AccordionContent';
import { AccordionItem } from './AccordionItem';
import { AccordionTrigger } from './AccordionTrigger';

/**
 * `Accordion` is Radix's `Accordion.Root` re-exported directly, and its props
 * are a discriminated union on `type` — so each story supplies its own `args`
 * rather than sharing a default. `render` alone will not typecheck: `type` is
 * required, and the two branches accept different `value` shapes.
 */
const meta: Meta<typeof Accordion> = {
  component: Accordion,
  parameters: { controls: { disable: true } },
  title: 'Components/Accordion',
};

export default meta;

type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  args: { collapsible: true, type: 'single' },
  render: (args) => (
    <Accordion {...args} className="w-96">
      <AccordionItem value="what">
        <AccordionTrigger>What is the workbench?</AccordionTrigger>
        <AccordionContent>
          A Storybook host for the shadcn component library.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="where">
        <AccordionTrigger>Where do stories live?</AccordionTrigger>
        <AccordionContent>
          Beside the component they document, inside the package.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="how">
        <AccordionTrigger>How do I add one?</AccordionTrigger>
        <AccordionContent>
          Use the story sub-generator in @tools/generators.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

/** `type="multiple"` lets several items stay open at once. */
export const Multiple: Story = {
  args: { defaultValue: ['first', 'second'], type: 'multiple' },
  render: (args) => (
    <Accordion {...args} className="w-96">
      <AccordionItem value="first">
        <AccordionTrigger>First</AccordionTrigger>
        <AccordionContent>Open by default.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="second">
        <AccordionTrigger>Second</AccordionTrigger>
        <AccordionContent>Also open by default.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const WithDisabledItem: Story = {
  args: { collapsible: true, type: 'single' },
  render: (args) => (
    <Accordion {...args} className="w-96">
      <AccordionItem value="available">
        <AccordionTrigger>Available</AccordionTrigger>
        <AccordionContent>This one opens.</AccordionContent>
      </AccordionItem>
      <AccordionItem disabled={true} value="unavailable">
        <AccordionTrigger>Unavailable</AccordionTrigger>
        <AccordionContent>Never reachable.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
