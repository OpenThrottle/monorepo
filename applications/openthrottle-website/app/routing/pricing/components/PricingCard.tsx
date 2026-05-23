import * as React from 'react';
import { Link } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
} from '@openthrottle/react-router-shadcn';
import { StripeProductObject } from '~/__generated__/graphql';
import { formatPrice, getDisplayPrice } from '~/global/utils/formatters';

interface PricingCardProps {
  readonly className?: string;
  /** When set, CTA renders as a Link to this path (e.g. checkout or contact). */
  readonly ctaTo?: string;
  readonly index: number;
  readonly product: StripeProductObject;
  readonly yearly: boolean;
}

export const PricingCard = (props: PricingCardProps): React.ReactElement => {
  const { className, ctaTo, index, product, yearly } = props;

  // Hooks

  // Setup
  const isDemoCard = index === 0;

  const { price, label: priceLabel } = getDisplayPrice(product, yearly);
  const baseStyles = 'overflow-hidden bg-transparent! h-full flex flex-col ';
  const ctaContent = product.defaultPriceId ? 'Get Started' : 'Contact Us';
  const cardClassName = !isDemoCard
    ? cn(baseStyles + 'rounded-[calc(var(--radius) - 2px)]', className)
    : cn(baseStyles + 'bg-transparent border-border', className);

  // Handlers

  // Markup
  const ctaElement = ctaTo ? (
    <Button asChild={true} className="w-full font-black" size="lg">
      <Link to={ctaTo}>{ctaContent}</Link>
    </Button>
  ) : (
    <Button className="w-full font-black" size="lg">
      {ctaContent}
    </Button>
  );

  const card = (
    <Card className={cardClassName} data-testid="PricingCard">
      <CardHeader className="bg-card space-y-2">
        <CardTitle className="flex items-center mb-4 justify-between">
          {product.name}
        </CardTitle>
        <CardDescription>{product.description}</CardDescription>
      </CardHeader>

      <CardContent className="bg-card flex-1 space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">
            {formatPrice(price)}
            <span className="text-lg font-normal text-muted-foreground">
              {priceLabel}
            </span>
          </span>
        </div>
      </CardContent>

      <CardFooter className="bg-card p-6 mt-px" color="accent">
        {ctaElement}
      </CardFooter>
    </Card>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return !isDemoCard ? (
    <div className="shimmer-border rounded-lg">{card}</div>
  ) : (
    card
  );
};
