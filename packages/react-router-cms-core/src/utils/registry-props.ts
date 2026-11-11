import type {
  ButtonProps,
  CardProps,
  CarouselProps,
  HeadingProps,
  HeroProps,
  ImageProps,
  LayoutProps,
  LinkProps,
  TweetProps,
  WysiwygProps,
} from '@openthrottle/react-router-cms-ui';

import type { LayoutColumnProps } from '../components/LayoutColumn';
import type { LayoutGridProps } from '../components/LayoutGrid';
import type { LogicCookiesProps } from '../components/LogicCookies';
import type { LogicParamsProps } from '../components/LogicParams';
import { REGISTRY_OPTIONS } from '../data/data.registry-options';
import type { CmsRenderProps } from '../types/cms-render';
import {
  readOneOf,
  readOptionalString,
  readString,
  readStringList,
  readStringRecord,
} from './read-property';

/**
 * @public
 */
export const toButtonProps = (render: CmsRenderProps): ButtonProps => {
  const { properties } = render;

  return {
    className: readOptionalString(properties, 'className'),
    cta: readString(properties, 'cta', ''),
    size: readOneOf(properties, 'size', REGISTRY_OPTIONS.buttonSize, 'md'),
    variant: readOneOf(
      properties,
      'variant',
      REGISTRY_OPTIONS.buttonVariant,
      'primary',
    ),
  };
};

/**
 * @public
 */
export const toCardProps = (render: CmsRenderProps): CardProps => {
  const { properties } = render;

  return {
    className: readOptionalString(properties, 'className'),
    copy: readString(properties, 'copy', ''),
    heading: readString(properties, 'heading', ''),
    icon: readOneOf(properties, 'icon', REGISTRY_OPTIONS.cardIcon, 'Star'),
  };
};

/**
 * @public
 */
export const toCarouselProps = (render: CmsRenderProps): CarouselProps => {
  const { properties } = render;

  return {
    className: readOptionalString(properties, 'className'),
    images: readStringList(properties, 'images'),
  };
};

/**
 * @public
 */
export const toHeadingProps = (render: CmsRenderProps): HeadingProps => {
  const { properties } = render;

  return {
    className: readOptionalString(properties, 'className'),
    copy: readString(properties, 'copy', ''),
    heading: readOneOf(
      properties,
      'heading',
      REGISTRY_OPTIONS.headingLevel,
      'h2',
    ),
  };
};

/**
 * @public
 */
export const toHeroProps = (render: CmsRenderProps): HeroProps => {
  const { properties } = render;

  return {
    className: readOptionalString(properties, 'className'),
    heading: readString(properties, 'heading', ''),
    highlight: readString(properties, 'highlight', ''),
    subheading: readString(properties, 'subheading', ''),
  };
};

/**
 * @public
 */
export const toImageProps = (render: CmsRenderProps): ImageProps => {
  const { properties } = render;

  return {
    alt: readString(properties, 'alt', ''),
    aspectRatio: readString(properties, 'aspectRatio', 'auto'),
    className: readOptionalString(properties, 'className'),
    src: readString(properties, 'src', ''),
  };
};

/**
 * @public
 */
export const toLayoutProps = (render: CmsRenderProps): LayoutProps => {
  const { children, properties } = render;

  return { children, className: readOptionalString(properties, 'className') };
};

/**
 * @public
 */
export const toLinkProps = (render: CmsRenderProps): LinkProps => {
  const { properties } = render;

  return {
    className: readOptionalString(properties, 'className'),
    cta: readString(properties, 'cta', ''),
    to: readString(properties, 'to', '/'),
  };
};

/**
 * @public
 */
export const toTweetProps = (render: CmsRenderProps): TweetProps => {
  const { properties } = render;

  return {
    className: readOptionalString(properties, 'className'),
    handle: readString(properties, 'handle', ''),
    image: readString(properties, 'image', ''),
    tweet: readString(properties, 'tweet', ''),
    username: readString(properties, 'username', ''),
  };
};

/**
 * @public
 */
export const toWysiwygProps = (render: CmsRenderProps): WysiwygProps => {
  const { properties } = render;

  return {
    className: readOptionalString(properties, 'className'),
    html: readString(properties, 'html', ''),
  };
};

/**
 * @public
 */
export const toLayoutColumnProps = (
  render: CmsRenderProps,
): LayoutColumnProps => {
  const { children, properties } = render;

  return { children, className: readOptionalString(properties, 'className') };
};

/**
 * @public
 */
export const toLayoutGridProps = (render: CmsRenderProps): LayoutGridProps => {
  const { children, properties } = render;

  return { children, className: readOptionalString(properties, 'className') };
};

/**
 * @public
 */
export const toLogicCookiesProps = (
  render: CmsRenderProps,
): LogicCookiesProps => {
  const { children, properties } = render;

  return { children, cookies: readStringRecord(properties, 'cookies') };
};

/**
 * @public
 */
export const toLogicParamsProps = (
  render: CmsRenderProps,
): LogicParamsProps => {
  const { children, properties } = render;

  return {
    children,
    param: readString(properties, 'param', ''),
    value: readString(properties, 'value', ''),
  };
};
