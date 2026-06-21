import * as React from 'react';
import classnames from 'classnames';
import { Button } from '@openthrottle/react-router-shadcn';
import { Form } from 'react-router';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { OpenThrottleBreadcrumbs } from '@openthrottle/react-router-ui';

export interface GlobalHeaderProps {
  className?: string;
}

export const GlobalHeader = (
  props: GlobalHeaderProps,
): React.ReactElement | null => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  const getRidOf = true;
  if (getRidOf) {
    return null;
  }

  return (
    <nav
      className={classnames(
        'border-border border-b',
        'bg-card/50 backdrop-blur-sm',
        'px-4 py-2',
        'sticky top-0 z-10 w-full',
        'flex items-center justify-between',
        className,
      )}
    >
      {/* <SidebarTrigger
        aria-label="Toggle sidebar"
        className="text-muted-foreground"
      /> */}

      <OpenThrottleBreadcrumbs
        children="Example"
        className="ml-4"
        links={[
          { children: 'Home', to: '/' },
          { children: 'Dashboard', to: '/dashboard' },
        ]}
      />

      <Form action="/" method="post">
        <input name="intent" type="hidden" value="signout" />
        <Button
          className="text-foreground flex w-full justify-start gap-2 p-4 text-left"
          size="sm"
          type="submit"
          variant="link"
        >
          <SignOutIcon className="size-5" />
          Sign out
        </Button>
      </Form>
    </nav>
  );
};
