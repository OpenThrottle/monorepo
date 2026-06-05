import * as React from 'react';
import classnames from 'classnames';
import { Button } from '@openthrottle/react-router-shadcn';

export interface OpenThrottleProductFeaturesProps {
  className?: string;
  features: {
    description: string;
    icon: React.ElementType;
    title: string;
  }[];
}

export const OpenThrottleProductFeatures = (
  props: OpenThrottleProductFeaturesProps,
): React.ReactElement => {
  const { className, features } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={classnames(
        'gap-4 md:gap-8 lg:gap-12',
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        // 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        className,
      )}
      data-testid="OpenThrottleProductFeatures"
    >
      {features.map((feature) => {
        const Icon = feature.icon;

        return (
          <div
            className="p-4 flex flex-col border border-border rounded-lg h-full"
            key={feature.title}
          >
            <h2 className="mb-2 flex items-center gap-4">
              <Icon className="size-4" />
              <span>{feature.title}</span>
            </h2>
            <p className="text-xs flex-1 text-muted-foreground">
              {feature.description}
            </p>

            <div className="flex justify-end">
              <Button className="mt-4" size="xs" variant="link">
                Learn more
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
};
