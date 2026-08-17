import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  type SidebarProps,
} from './index';

const VARIANTS: readonly NonNullable<SidebarProps['variant']>[] = [
  'sidebar',
  'floating',
  'inset',
];

const NAV = [
  { badge: '3', label: 'Plans' },
  { badge: undefined, label: 'Projects' },
  { badge: '12', label: 'Notes' },
];

/**
 * The largest family in the package (~30 files). Two things make it different
 * from every other component here:
 *
 * 1. `SidebarProvider` is REQUIRED — the parts read open/collapsed state from
 *    its context, and `SidebarTrigger` throws without it.
 * 2. It is width- and breakpoint-sensitive: below `md` the sidebar renders as a
 *    Sheet instead of the docked panel. That branch is decided by a matchMedia
 *    read AT MOUNT, so resizing the canvas afterwards does not switch it —
 *    reload the story after changing the viewport, or the desktop sidebar stays
 *    absent from the DOM entirely (not merely hidden).
 *
 * The component source is router-free, so no router stub is needed here — only
 * its `__tests__` reach for one.
 */
const meta = {
  component: Sidebar,
  parameters: { controls: { disable: true }, layout: 'fullscreen' },
  title: 'Components/Sidebar',
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarInput placeholder="Search…" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton isActive={item.label === 'Plans'}>
                      {item.label}
                    </SidebarMenuButton>
                    {item.badge ? (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Recent</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Build 4821</SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton>Logs</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton>Artifacts</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>Settings</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium">Build 4821</span>
        </header>
        <main className="p-4 text-sm">
          <p>`SidebarInset` is the content pane beside the sidebar.</p>
          <p className="text-muted-foreground">
            Use the trigger to collapse and expand.
          </p>
        </main>
      </SidebarInset>
    </SidebarProvider>
  ),
};

/** `defaultOpen={false}` starts collapsed — the offcanvas default. */
export const Collapsed: Story = {
  render: () => (
    <SidebarProvider defaultOpen={false}>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton>{item.label}</SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium">Collapsed</span>
        </header>
      </SidebarInset>
    </SidebarProvider>
  ),
};

/** `collapsible="icon"` keeps a rail of icons instead of hiding entirely. */
export const CollapsibleIcon: Story = {
  render: () => (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton tooltip={item.label}>
                      <span>◆</span>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium">Icon rail</span>
        </header>
      </SidebarInset>
    </SidebarProvider>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {VARIANTS.map((variant) => (
        <div className="flex flex-col gap-2" key={variant}>
          <span className="text-muted-foreground px-4 text-xs font-medium">
            {variant}
          </span>
          <div className="h-64 overflow-hidden border">
            <SidebarProvider>
              <Sidebar variant={variant}>
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {NAV.map((item) => (
                          <SidebarMenuItem key={item.label}>
                            <SidebarMenuButton>{item.label}</SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </Sidebar>
              <SidebarInset>
                <div className="p-4 text-sm">{variant}</div>
              </SidebarInset>
            </SidebarProvider>
          </div>
        </div>
      ))}
    </div>
  ),
};

/** `side="right"` mirrors the whole layout. */
export const RightSide: Story = {
  render: () => (
    <SidebarProvider>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium">Right-hand sidebar</span>
        </header>
      </SidebarInset>
      <Sidebar side="right">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton>{item.label}</SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  ),
};

/** The loading state — `SidebarMenuSkeleton` mirrors the menu button shape. */
export const Loading: Story = {
  render: () => (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 5 }, (_value, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuSkeleton showIcon={true} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset />
    </SidebarProvider>
  ),
};
