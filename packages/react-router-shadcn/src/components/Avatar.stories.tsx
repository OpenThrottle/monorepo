import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
  type AvatarProps,
} from './Avatar';

/**
 * `size` is a plain prop rather than a `cva` map — it drives `data-size` and is
 * styled with `data-[size=…]` selectors — so this list is written out rather
 * than derived.
 */
const SIZES: readonly NonNullable<AvatarProps['size']>[] = [
  'sm',
  'default',
  'lg',
];

/** An inline data URI keeps the story self-contained — no network fetch. */
const AVATAR_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(208 100% 50%)"/><circle cx="32" cy="24" r="12" fill="white"/><ellipse cx="32" cy="56" rx="20" ry="16" fill="white"/></svg>`,
  );

const meta = {
  component: Avatar,
  parameters: { controls: { disable: true } },
  title: 'Components/Avatar',
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Avatar>
      <AvatarImage alt="Ada Lovelace" src={AVATAR_IMAGE} />
      <AvatarFallback>AL</AvatarFallback>
    </Avatar>
  ),
};

/** The fallback renders whenever the image is missing or fails to load. */
export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>AL</AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {SIZES.map((size) => (
        <Avatar key={size} size={size}>
          <AvatarImage alt="" src={AVATAR_IMAGE} />
          <AvatarFallback>{size}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  ),
};

/** `AvatarBadge` is positioned by the group/avatar wrapper on the root. */
export const WithBadge: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {SIZES.map((size) => (
        <Avatar key={size} size={size}>
          <AvatarImage alt="" src={AVATAR_IMAGE} />
          <AvatarFallback>AL</AvatarFallback>
          <AvatarBadge className="bg-green-500" />
        </Avatar>
      ))}
    </div>
  ),
};

/** `AvatarGroup` overlaps its children; `AvatarGroupCount` closes the stack. */
export const Group: Story = {
  render: () => (
    <AvatarGroup>
      {['AL', 'GH', 'KT'].map((initials) => (
        <Avatar key={initials}>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      ))}
      <AvatarGroupCount>+4</AvatarGroupCount>
    </AvatarGroup>
  ),
};
