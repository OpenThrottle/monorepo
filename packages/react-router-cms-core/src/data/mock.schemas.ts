import type { CmsJsonSchema } from '../types/cms-json-schema';

/**
 * @description The component schemas upstream RocketCMS generated from its block props, keyed by
 * definition name. Specs only — not exported from the package.
 */
export const MOCK_SCHEMAS = {
  ButtonProps: {
    description: 'The Button component is responsible for...',
    properties: {
      className: {
        default: 'uppercase',
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
      cta: {
        default: 'Call to action',
        description: 'A required heading',
        type: 'string',
      },
      secondary: {
        default: false,
        description: `The secondary version is the same button / link\nwithout the outline`,
        type: 'boolean',
      },
      size: {
        default: "'md'",
        description: 'Controls the sizing of the button',
        enum: ['lg', 'md', 'sm', 'xl'],
        type: 'string',
      },
    },
    required: ['cta'],
    type: 'object',
  },
  CardProps: {
    description: 'The Card component is responsible for...',
    properties: {
      className: {
        default: 'bg-color-primary',
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
      copy: {
        default: 'This is a  card component.',
        description: 'The copy displayed within the card',
        type: 'string',
      },
      heading: {
        default: "Don't mess with Texas",
        description: 'The card heading',
        type: 'string',
      },
      icon: {
        default: 'Pencil',
        description: 'The name of a Phosphor icon to use.',
        enum: ['Pencil', 'Rocket', 'Star', 'Sun'],
        type: 'string',
      },
    },
    required: ['copy', 'heading', 'icon'],
    type: 'object',
  },
  HeadingProps: {
    description: `A simple component that renders a heading and text that\ncan be styled with a class name(s).`,
    properties: {
      className: {
        default: 'text-3xl text-highlight',
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
      copy: {
        default: `Do not take life too seriously. You will never get out of it alive.`,
        description: 'The copy displayed within the heading.',
        type: 'string',
      },
      heading: {
        default: 'h2',
        description: 'Select the correct heading tag to use.',
        enum: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        type: 'string',
      },
    },
    required: ['copy', 'heading'],
    type: 'object',
  },
  HeroProps: {
    description: `The Hero component is a large headline with a smaller\nsubheading.`,
    properties: {
      className: {
        default: 'my-20',
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
      heading: {
        default: 'Monorepos that',
        description: 'First part of the heading (non gradient)',
        type: 'string',
      },
      highlight: {
        default: 'make ship happen.',
        description: 'Highlighted part of the heading (gradient)',
        type: 'string',
      },
      subheading: {
        default: `Turborepo is a high-performance build system for JavaScript and TypeScript codebases.`,
        description: 'Smaller but longer copy...',
        type: 'string',
      },
    },
    required: ['heading', 'highlight', 'subheading'],
    type: 'object',
  },
  ImageProps: {
    description: 'The Image component is responsible for...',
    properties: {
      alt: {
        description: 'Alt text to use when rendering this image. This',
        type: 'string',
      },
      className: {
        default: 'indent-4 text-center my-10',
        description: 'Classes to be applied onto the wrapping div of the image',
        type: 'className',
      },
      src: {
        default: 'https://picsum.photos/id/503/2500/800',
        description: 'The image to be displayed',
        type: 'string',
      },
    },
    required: ['alt', 'src'],
    type: 'object',
  },
  LayoutColumnProps: {
    description: `The LayoutColumn component is a simple component that renders\n... Lorem ipsum dolor sit amet consectetur, adipisicing elit.`,
    properties: {
      children: {
        description: `The child components to be rendered via this Layout component.`,
        type: 'children',
      },
      className: {
        default: 'flex gap-4 flex-col',
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
    },
    required: ['children'],
    type: 'object',
  },
  LayoutGridProps: {
    description: `The LayoutGrid component is a simple component that renders\na grid layout around its child components.`,
    properties: {
      children: {
        description: `The child components to be rendered via this Layout component.`,
        type: 'children',
      },
      cite: {
        default: 'Frank Sinatra',
        description: 'An optional cite to attribute the quote',
        type: 'string',
      },
      className: {
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
    },
    required: ['children'],
    type: 'object',
  },
  LayoutProps: {
    description: `This component is essentially a "div" that we can use to\nwrap around other components, or "children" in our case.`,
    properties: {
      children: {
        description: `The child components to be rendered via this Layout component.`,
        type: 'children',
      },
      className: {
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
    },
    required: ['children'],
    type: 'object',
  },
  LinkProps: {
    description: 'The Link component is responsible for...',
    properties: {
      className: {
        default: 'uppercase',
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
      cta: {
        default: 'Call to action',
        description: 'A required heading',
        type: 'string',
      },
      icon: {
        default: 'fa-solid fa-bullseye',
        description: "Font awesome icon if you'd like",
        type: 'string',
      },
      to: {
        default: '/',
        description: 'Lets see what this one looks like',
        type: 'string',
      },
    },
    required: ['cta', 'to'],
    type: 'object',
  },
  LogicCookiesProps: {
    description: `This component hooks into the available cookies and\nprovides us a way to make decisions based on the cookies available.`,
    properties: {
      children: {
        description: `The child components to be rendered via this Logic component.`,
        type: 'children',
      },
      cookies: {
        default: '{}',
        description: 'An optional cite to attribute the quote',
        type: 'object',
      },
    },
    required: ['children', 'cookies'],
    type: 'object',
  },
  LogicParamsProps: {
    description: `This logic component hooks into the available params and\nprovides us a way to make decisions based on the params available.`,
    properties: {
      children: {
        description: `The child components to be rendered via this Logic component.`,
        type: 'children',
      },
      param: {
        description: 'The URL parameter to check against (case sensitive).',
        type: 'string',
      },
      value: {
        description: `The expected value of the URL parameter (case sensitive).`,
        type: 'string',
      },
    },
    required: ['children', 'param', 'value'],
    type: 'object',
  },
  TweetProps: {
    description: 'The Tweet component is responsible for...',
    properties: {
      className: {
        default: '',
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
      handle: {
        default: 'visormatt',
        description: 'The user who tweeted',
        type: 'string',
      },
      image: {
        default: 'https://picsum.photos/40/40',
        description: 'The users profile photo on "X"',
        type: 'string',
      },
      tweet: {
        default: 'The tweet goes <b>here</b>',
        description: 'The tweet "content" to be displayed',
        type: 'string',
      },
      username: {
        default: 'Matthew Scholta',
        description: 'The username to be displayed',
        type: 'string',
      },
    },
    required: ['handle', 'image', 'tweet', 'username'],
    type: 'object',
  },
  WysiwygProps: {
    description: 'The Wysiwyg component is responsible for...',
    properties: {
      className: {
        default: 'my-20',
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
      html: {
        default: `<div class="mx-auto max-w-2xl my-20">\n<p class="mb-6 text-lg leading-normal text-current lg:text-xl">Lorem ipsum dolor sit amet consectetur adipisicing elit. Explicabo porro debitis blanditiis corrupti dignissimos voluptate exercitationem quasi dolor, quisquam, voluptatum repellendus quidem labore maxime sapiente quis rerum deserunt nemo velit.</p>\n<p class="mb-6 text-lg leading-normal text-current lg:text-xl">Lorem ipsum dolor sit.</p>\n<p class="mb-6 text-lg leading-normal text-current lg:text-xl">Lorem ipsum, dolor sit amet consectetur adipisicing elit. Nihil, magnam aliquid. Deleniti cupiditate magni omnis maiores doloribus nihil, quis aspernatur accusamus molestiae quas maxime soluta quae, illo harum culpa. Sit.</p>\n<p class="mb-6 text-lg leading-normal text-current lg:text-xl">Lorem ipsum dolor sit, amet consectetur adipisicing elit. Aspernatur iure et, enim, nostrum blanditiis ipsa deleniti dignissimos esse iste voluptatem possimus ipsum officiis!</p>\n\n<div class="flex items-center space-x-4 py-4">\n<div class="h-24 w-24 overflow-hidden rounded-full">\n<img alt="" src="https://mattscholta.com/images/assets/matt-scaled.webp">\n</div>\n<div class="flex h-full flex-col space-y-1">\n<h4 class="heading inline-flex items-center text-2xl font-medium leading-tight">Matthew Scholta</h4>\n<p class="heading inline-flex items-center text-lg font-normal leading-tight text-current">Creator of RocketCMS</p>\n</div>\n</div>\n</div>`,
        description: 'The HTML content to be displayed',
        type: 'wysiwyg',
      },
    },
    required: ['html'],
    type: 'object',
  },
} satisfies Readonly<Record<string, CmsJsonSchema>>;
