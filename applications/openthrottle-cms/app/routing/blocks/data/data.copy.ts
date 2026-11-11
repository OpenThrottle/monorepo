/**
 * @description Single-sourced user-facing copy for the blocks preview. The
 * component renders these and specs import the same constants, so a wording
 * change updates one place and no spec breaks on copy drift.
 */
export const BLOCKS_COPY = {
  debugLabel: 'Debug outlines',
  description: `Every @openthrottle/react-router-cms-ui block rendered with representative props. Debug mode merges each block's debug class name on top of its own classes.`,
  sections: {
    button: 'Button',
    card: 'Card',
    carousel: 'Carousel',
    heading: 'Heading',
    hero: 'Hero',
    image: 'Image',
    layout: 'Layout',
    link: 'Link',
    tweet: 'Tweet',
    wysiwyg: 'Wysiwyg',
  },
  title: 'Blocks',
} as const;
