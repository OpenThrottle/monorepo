import {
  Button,
  Card,
  Carousel,
  Heading,
  Hero,
  Image,
  Layout,
  Link,
  Tweet,
  Wysiwyg,
} from '@openthrottle/react-router-cms-ui';

import { LayoutColumn } from '../components/LayoutColumn';
import { LayoutGrid } from '../components/LayoutGrid';
import { LogicCookies } from '../components/LogicCookies';
import { LogicParams } from '../components/LogicParams';
import type { CmsComponentRegistry } from '../types/cms-render';
import { registerComponent } from '../utils/register-component';
import {
  toButtonProps,
  toCardProps,
  toCarouselProps,
  toHeadingProps,
  toHeroProps,
  toImageProps,
  toLayoutColumnProps,
  toLayoutGridProps,
  toLayoutProps,
  toLinkProps,
  toLogicCookiesProps,
  toLogicParamsProps,
  toTweetProps,
  toWysiwygProps,
} from '../utils/registry-props';

/**
 * @description The components every CMS layout can use, by fragment `typename`: the content blocks
 * from `@openthrottle/react-router-cms-ui` plus this package's layout and logic components.
 * Upstream's `SurveyRenderer` is not ported. Kept out of the `data/` barrel so that importing copy
 * from a component never pulls the whole registry in.
 * @public
 */
export const CORE_COMPONENTS: CmsComponentRegistry = {
  Button: registerComponent(Button, toButtonProps),
  Card: registerComponent(Card, toCardProps),
  Carousel: registerComponent(Carousel, toCarouselProps),
  Heading: registerComponent(Heading, toHeadingProps),
  Hero: registerComponent(Hero, toHeroProps),
  Image: registerComponent(Image, toImageProps),
  Layout: registerComponent(Layout, toLayoutProps),
  LayoutColumn: registerComponent(LayoutColumn, toLayoutColumnProps),
  LayoutGrid: registerComponent(LayoutGrid, toLayoutGridProps),
  Link: registerComponent(Link, toLinkProps),
  LogicCookies: registerComponent(LogicCookies, toLogicCookiesProps),
  LogicParams: registerComponent(LogicParams, toLogicParamsProps),
  Tweet: registerComponent(Tweet, toTweetProps),
  Wysiwyg: registerComponent(Wysiwyg, toWysiwygProps),
};
