import * as React from 'react';
import clsx from 'clsx';

export interface <%= name %>Props {
  className?: string;
  data: {
    age: number;
    name: string;
    uuid: string;
  }[];
}

export const <%= name %> = (props: <%= name %>Props): React.ReactElement => {
  const { className, data } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <table
      className={clsx('w-full', className)}
      data-testid="<%= name %>"
    >
      <thead className="font-semibold text-left sticky top-0 ui-background [&_th]:p-2">
        <tr>
          <th>Name</th>
          <th>Age</th>
        </tr>
      </thead>
      <tbody
        // className="divide-y divide-ui-border-light"
        className="[&_td]:px-4 [&_td]:py-2"
      >
        {data.map((item) => (
          <tr className="ui-border-light border-b" key={item.uuid}>
            <td>{item.name}</td>
            <td>{item.age}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
