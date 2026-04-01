import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { HOME_FEATURES, HOME_FEATURES_DOC_URL } from '~/routing/home/data';

export interface HomeFeaturesProps {
  className?: string;
}

export const HomeFeatures = (props: HomeFeaturesProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={classnames('px-4 py-16 sm:px-6 md:py-24', className)}
      data-testid="HomeFeatures"
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Features
        </h2>
        <p className="mt-4 text-center text-muted-foreground">
          Source of truth:{' '}
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href={HOME_FEATURES_DOC_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            docs/openthrottle/features.md
          </a>
        </p>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {HOME_FEATURES.map((feature) => (
            <li key={feature.title}>
              <Card className="h-full p-8">
                <CardHeader>
                  <CardTitle className="text-lg mb-2">
                    {feature.title}
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
