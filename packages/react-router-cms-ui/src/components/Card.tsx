import {
  Card as ShadcnCard,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CARD_FALLBACK_ICON, CARD_ICONS } from '../data/data.card-icons';
import type { CmsComponentDebug } from '../types';

/**
 * @public
 * @description A content card with an icon, a heading and supporting copy.
 */
export interface CardProps {
  /**
   * @default ""
   * @description Classes to be applied on the component.
   * @TJS-type className
   */
  readonly className?: string;

  /**
   * @default "This is a sample card component."
   * @description The copy displayed within the card
   */
  readonly copy: string;

  /**
   * @default "Don't mess with Texas"
   * @description The card heading
   */
  readonly heading: string;

  /**
   * @default "Pencil"
   * @description The name of the icon to show beside the heading.
   */
  readonly icon: 'Pencil' | 'Rocket' | 'Star' | 'Sun';
}

/**
 * @public
 */
export const Card = (props: CardProps): React.ReactElement => {
  const { className, copy, heading, icon } = props;

  // Hooks

  // Setup
  const isKnownIcon = Object.hasOwn(CARD_ICONS, icon);
  const Icon = isKnownIcon ? CARD_ICONS[icon] : CARD_FALLBACK_ICON;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ShadcnCard className={cn('p-6 md:p-10', className)}>
      <CardHeader className="flex items-center gap-4 px-0">
        <Icon aria-hidden="true" data-testid="CardIcon" size={24} />
        <CardTitle>
          <h3 className="text-lg font-medium">{heading}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <p className="text-muted-foreground text-base font-medium">{copy}</p>
      </CardContent>
    </ShadcnCard>
  );
};

Card.debug = {
  className: undefined,
} satisfies CmsComponentDebug;
