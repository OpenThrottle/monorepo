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
import { cn, Label, Switch } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { BLOCK_SAMPLES } from '../data/data.blocks';
import { BLOCKS_COPY } from '../data/data.copy';
import { debugClassName } from '../utils/debug-class-name';

export interface BlocksPreviewProps {
  readonly className: string | undefined;
}

export const BlocksPreview = (
  props: BlocksPreviewProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const switchId = React.useId();
  const [isDebug, setIsDebug] = React.useState(false);

  // Setup
  const { button, card, carousel, heading, hero, image, layout, link } =
    BLOCK_SAMPLES;
  const { tweet, wysiwyg } = BLOCK_SAMPLES;
  const { debugLabel, sections } = BLOCKS_COPY;

  // Handlers
  const handleDebugChange = (checked: boolean): void => {
    setIsDebug(checked);
  };

  // Markup
  const blocks = [
    {
      block: (
        <Hero
          {...hero}
          className={debugClassName(Hero, isDebug, hero.className)}
        />
      ),
      label: sections.hero,
    },
    {
      block: (
        <Heading
          {...heading}
          className={debugClassName(Heading, isDebug, heading.className)}
        />
      ),
      label: sections.heading,
    },
    {
      block: (
        <Button
          {...button}
          className={debugClassName(Button, isDebug, undefined)}
        />
      ),
      label: sections.button,
    },
    {
      block: (
        <Link
          {...link}
          className={debugClassName(Link, isDebug, link.className)}
        />
      ),
      label: sections.link,
    },
    {
      block: (
        <Card {...card} className={debugClassName(Card, isDebug, undefined)} />
      ),
      label: sections.card,
    },
    {
      block: (
        <Layout className={debugClassName(Layout, isDebug, layout.className)}>
          <Card
            {...card}
            className={debugClassName(Card, isDebug, undefined)}
          />
        </Layout>
      ),
      label: sections.layout,
    },
    {
      block: (
        <Image
          {...image}
          className={debugClassName(Image, isDebug, image.className)}
        />
      ),
      label: sections.image,
    },
    {
      block: (
        <Carousel
          {...carousel}
          className={debugClassName(Carousel, isDebug, undefined)}
        />
      ),
      label: sections.carousel,
    },
    {
      block: (
        <Tweet
          {...tweet}
          className={debugClassName(Tweet, isDebug, undefined)}
        />
      ),
      label: sections.tweet,
    },
    {
      block: (
        <Wysiwyg
          {...wysiwyg}
          className={debugClassName(Wysiwyg, isDebug, undefined)}
        />
      ),
      label: sections.wysiwyg,
    },
  ];

  const sectionList = blocks.map((entry) => {
    return (
      <section aria-label={entry.label} className="space-y-3" key={entry.label}>
        <p className="text-muted-foreground font-mono text-xs uppercase">
          {entry.label}
        </p>
        {entry.block}
      </section>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('space-y-10', className)} data-testid="BlocksPreview">
      <div className="flex items-center gap-3">
        <Switch
          checked={isDebug}
          id={switchId}
          onCheckedChange={handleDebugChange}
        />
        <Label htmlFor={switchId}>{debugLabel}</Label>
      </div>
      {sectionList}
    </div>
  );
};
