import * as React from 'react';
import classnames from 'classnames';
import { HOME_FEATURES } from '~/routing/home/data';

export interface HomeFeaturesProps {
  className?: string;
}

export const HomeFeatures = (props: HomeFeaturesProps): React.ReactElement => {
  const { className } = props;

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
      data-testid="HomeFeatures"
    >
      {HOME_FEATURES.map((feature) => {
        const Icon = feature.icon;

        return (
          <div
            className="p-4 border border-border rounded-lg h-full"
            key={feature.title}
          >
            <h2 className="text-lg mb-2 flex items-center gap-4">
              <Icon className="size-4" />
              <span>{feature.title}</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              {feature.description}
            </p>
          </div>
        );
      })}
    </section>
  );
};
