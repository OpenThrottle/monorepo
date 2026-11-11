/**
 * @description The values the cms-ui blocks accept for their enum props, used to narrow stored
 * properties before they reach a block.
 * @public
 */
export const REGISTRY_OPTIONS = {
  buttonSize: ['lg', 'md', 'sm', 'xl'],
  buttonVariant: ['primary', 'secondary'],
  cardIcon: ['Pencil', 'Rocket', 'Star', 'Sun'],
  headingLevel: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
} as const;
