/**
 * @description CMS button sizes mapped onto the shadcn `Button` sizes. shadcn
 * has no `xl`, so it rides `lg` with extra height and padding.
 */
export const BUTTON_SIZES = {
  lg: { className: undefined, size: 'lg' },
  md: { className: undefined, size: 'default' },
  sm: { className: undefined, size: 'sm' },
  xl: { className: 'h-12 px-8 text-base', size: 'lg' },
} as const;

/**
 * @description CMS button variants mapped onto the shadcn `Button` variants.
 * `secondary` is "the same button without the outline" upstream, hence ghost.
 */
export const BUTTON_VARIANTS = {
  primary: 'default',
  secondary: 'ghost',
} as const;
