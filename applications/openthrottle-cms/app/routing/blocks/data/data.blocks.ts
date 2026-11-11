import type {
  ButtonProps,
  CardProps,
  CarouselProps,
  HeadingProps,
  HeroProps,
  ImageProps,
  LinkProps,
  TweetProps,
  WysiwygProps,
} from '@openthrottle/react-router-cms-ui';

/**
 * @description Invisible until a debug class recolors it, so turning debug mode
 * on draws an outline without shifting the layout.
 */
const DEBUG_FRAME = 'border-2 border-transparent';

/**
 * @description Representative props for every block on the preview route. The
 * `Layout` sample has no props entry because its content is JSX, which the
 * component composes itself.
 */
export const BLOCK_SAMPLES = {
  button: {
    cta: 'Call to action',
    size: 'md',
    variant: 'primary',
  },
  card: {
    copy: 'This is a sample card component.',
    heading: 'Launch ready',
    icon: 'Rocket',
  },
  carousel: {
    images: [
      'https://picsum.photos/id/300/1600/400',
      'https://picsum.photos/id/301/1600/400',
      'https://picsum.photos/id/302/1600/400',
    ],
  },
  heading: {
    className: 'text-3xl',
    copy: 'Do not take life too seriously. You will never get out of it alive.',
    heading: 'h2',
  },
  hero: {
    className: 'my-10',
    heading: 'A custom CMS',
    highlight: 'using your code',
    subheading: 'Build, ship, and iterate on your content with ease.',
  },
  image: {
    alt: 'A wide landscape photograph',
    aspectRatio: '16 / 5',
    className: DEBUG_FRAME,
    src: 'https://picsum.photos/id/503/2500/800',
  },
  layout: {
    className: `${DEBUG_FRAME} rounded-md p-4`,
  },
  link: {
    className: DEBUG_FRAME,
    cta: 'Back to the overview',
    to: '/overview',
  },
  tweet: {
    handle: 'visormatt',
    image: 'https://picsum.photos/id/64/80/80',
    tweet: 'Content blocks, now rendered from <b>real</b> CMS data.',
    username: 'Matthew Scholta',
  },
  wysiwyg: {
    html: [
      '<h2>Rich text</h2>',
      '<p>Descendant styles give server-rendered markup spacing and lists without classes of its own.</p>',
      '<ul><li>Unordered item</li><li>Another item</li></ul>',
      '<ol><li>First step</li><li>Second step</li></ol>',
      '<pre>const block = "wysiwyg";</pre>',
      '<p>The last paragraph drops its bottom margin.</p>',
    ].join(''),
  },
} as const satisfies {
  readonly button: ButtonProps;
  readonly card: CardProps;
  readonly carousel: CarouselProps;
  readonly heading: HeadingProps;
  readonly hero: HeroProps;
  readonly image: ImageProps;
  readonly layout: { readonly className: string };
  readonly link: LinkProps;
  readonly tweet: TweetProps;
  readonly wysiwyg: WysiwygProps;
};
