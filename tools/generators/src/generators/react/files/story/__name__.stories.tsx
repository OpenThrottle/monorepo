import type { Meta, StoryObj } from '@storybook/react-vite';
<% if (variantGroups.length > 0) { -%>
import { <%= name %>, type <%= name %>Props } from './<%= name %>';
<% } else { -%>
import { <%= name %> } from './<%= name %>';
<% } -%>
<% if (variantGroups.length > 0) { %>
/**
 * `cva()` does not expose its variant map at runtime, so these lists are
 * declared rather than derived. They are typed against the component's own
 * props: an invalid option is a type error. The exhaustive list of valid ones
 * shows up in the Docs API table, which docgen reads off `<%= name %>Props`.
 */
<% variantGroups.forEach(function (group) { -%>
const <%= group.constName %>: readonly NonNullable<<%= name %>Props['<%= group.propName %>']>[] = [
<% group.options.forEach(function (option) { -%>
  '<%= option %>',
<% }); -%>
];
<% }); -%>
<% } %>
const meta = {
<% if (variantGroups.length > 0) { -%>
  argTypes: {
<% variantGroups.forEach(function (group) { -%>
    <%= group.propName %>: { control: 'select', options: <%= group.constName %> },
<% }); -%>
  },
<% } -%>
<% if (hasChildren) { -%>
  args: { children: '<%= name %>' },
<% } -%>
  component: <%= name %>,
  title: 'Components/<%= name %>',
} satisfies Meta<typeof <%= name %>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
<% if (variantGroups.length === 1) { %>
/** Every `<%= variantGroups[0].propName %>` at a glance. */
export const VariantMatrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {<%= variantGroups[0].constName %>.map((<%= variantGroups[0].propName %>) => (
<% if (hasChildren) { -%>
        <<%= name %> <%= matrixAttributes %>>{<%= variantGroups[0].propName %>}</<%= name %>>
<% } else { -%>
        <<%= name %> <%= matrixAttributes %> />
<% } -%>
      ))}
    </div>
  ),
};
<% } else if (variantGroups.length > 1) { %>
/**
 * Every `<%= variantGroups[0].propName %>` x `<%= variantGroups[1].propName %>` combination, so a regression in any one
 * of them is visible without clicking through the controls.
<% if (variantGroups.length > 2) { -%>
 *
 * Groups beyond the first two (<%= variantGroups.slice(2).map(function (g) { return g.propName; }).join(', ') %>) are exercised through the
 * controls rather than the grid — add a dedicated story if one needs pinning.
<% } -%>
 */
export const VariantMatrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-6">
      {<%= variantGroups[0].constName %>.map((<%= variantGroups[0].propName %>) => (
        <div className="flex flex-col gap-2" key={<%= variantGroups[0].propName %>}>
          <span className="text-muted-foreground text-xs font-medium">
            {<%= variantGroups[0].propName %>}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {<%= variantGroups[1].constName %>.map((<%= variantGroups[1].propName %>) => (
<% if (hasChildren) { -%>
              <<%= name %> <%= matrixAttributes %>>{<%= variantGroups[1].propName %>}</<%= name %>>
<% } else { -%>
              <<%= name %> <%= matrixAttributes %> />
<% } -%>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
<% } %>
