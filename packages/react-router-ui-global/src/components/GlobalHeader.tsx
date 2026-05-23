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
        'border-b border-border',
        'bg-card/50 backdrop-blur-sm',
        'py-2 px-4',
        // FIXME: Bring this back when we can populate with breadcrumbs easily
        'sticky w-full top-0 z-10',
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
          className="flex justify-start p-4 text-left gap-2 w-full text-foreground"
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
