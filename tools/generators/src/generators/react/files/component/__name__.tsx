import * as React from 'react';
import classnames from 'classnames';

export interface <%= name %>Props {
  className?: string;
}

export const <%= name %> = (props: <%= name %>Props) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="<%= name %>">
      <h2><%= name %></h2>
    </div>
  );
};
