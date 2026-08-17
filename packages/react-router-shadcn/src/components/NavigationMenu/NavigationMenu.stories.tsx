import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './index';

const meta = {
  component: NavigationMenu,
  parameters: { controls: { disable: true } },
  title: 'Components/NavigationMenu',
} satisfies Meta<typeof NavigationMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Site-level navigation with hover-opened panels. The viewport that hosts the
 * open panel is rendered by `NavigationMenu` itself — you do not compose it.
 */
export const Default: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Product</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-72 gap-1 p-2">
              <NavigationMenuLink href="#">Plans</NavigationMenuLink>
              <NavigationMenuLink href="#">Projects</NavigationMenuLink>
              <NavigationMenuLink href="#">Notes</NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-72 gap-1 p-2">
              <NavigationMenuLink href="#">Quickstart</NavigationMenuLink>
              <NavigationMenuLink href="#">Monorepo guide</NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink href="#">Changelog</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};
