import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs } from './Tabs';
import { TabsContent } from './TabsContent';
import { TabsList, type TabsListProps } from './TabsList';
import { TabsTrigger } from './TabsTrigger';

const LIST_VARIANTS: readonly NonNullable<TabsListProps['variant']>[] = [
  'default',
  'line',
];

const meta = {
  component: Tabs,
  parameters: { controls: { disable: true } },
  title: 'Components/Tabs',
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs className="w-96" defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="py-4 text-sm">Nine checks passed.</p>
      </TabsContent>
      <TabsContent value="logs">
        <p className="py-4 text-sm">No output captured for this run.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="py-4 text-sm">Inherited from the workspace.</p>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * The `cva` map lives on `TabsList`, not on `Tabs` — the root is a Radix
 * primitive with no variants. That is why the matrix iterates the LIST's
 * variants while composing the whole family.
 */
export const ListVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {LIST_VARIANTS.map((variant) => (
        <div className="flex flex-col gap-2" key={variant}>
          <span className="text-muted-foreground text-xs font-medium">
            {variant}
          </span>
          <Tabs className="w-96" defaultValue="overview">
            <TabsList variant={variant}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p className="py-4 text-sm">Overview panel.</p>
            </TabsContent>
            <TabsContent value="logs">
              <p className="py-4 text-sm">Logs panel.</p>
            </TabsContent>
          </Tabs>
        </div>
      ))}
    </div>
  ),
};

/**
 * `orientation` is read by the triggers through `group-data-[orientation=…]`,
 * so the vertical layout comes from the root rather than from list styling.
 */
export const Vertical: Story = {
  render: () => (
    <Tabs className="flex gap-4" defaultValue="overview" orientation="vertical">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="logs">Logs</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm">Overview panel.</p>
      </TabsContent>
      <TabsContent value="logs">
        <p className="text-sm">Logs panel.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm">Settings panel.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabledTrigger: Story = {
  render: () => (
    <Tabs className="w-96" defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger disabled={true} value="logs">
          Logs
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="py-4 text-sm">Logs are unavailable for this run.</p>
      </TabsContent>
    </Tabs>
  ),
};
