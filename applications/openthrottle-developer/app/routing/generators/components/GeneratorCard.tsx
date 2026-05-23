import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { GeneratorCardFragment } from '~/__generated__/graphql';

export interface GeneratorCardProps {
  className?: string;
  generator: GeneratorCardFragment;
}

export const GeneratorCard = (
  props: GeneratorCardProps,
): React.ReactElement => {
  const { className, generator } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames('', className)}
      data-testid="GeneratorCard"
      key={generator.name}
    >
      <CardContent className="p-4">
        <h2 className="text-lg font-bold mb-2">{generator.name}</h2>
        <p className="text-sm text-muted-foreground mb-0">
          {generator.description}
        </p>
      </CardContent>

      <CardFooter className="flex justify-end p-2 pt-0">
        <Button
          asChild={true}
          className="text-xs"
          size="default"
          variant="outline"
        >
          <Link to={`/generators/${encodeURIComponent(generator.name)}`}>
            View
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
