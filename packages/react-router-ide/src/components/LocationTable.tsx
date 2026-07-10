import * as React from 'react';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import type {
  DefinitionLocation,
  ReferenceLocation,
} from '../data/view-models';

export interface LocationTableProps {
  rows: (DefinitionLocation | ReferenceLocation)[];
}

/**
 * A scrollable table of source locations (no ScrollArea primitive yet — see plan c94eec42).
 *
 * @publicApi
 */
export const LocationTable = (
  props: LocationTableProps,
): React.ReactElement => {
  const { rows } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (rows.length === 0) {
    return <p className="text-muted-foreground p-4 text-sm">No locations.</p>;
  }

  return (
    <div className="max-h-80 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Path</TableHead>
            <TableHead className="w-24 text-right">Line:Col</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.path}:${row.line}:${row.column}:${index}`}>
              <TableCell className="font-mono text-xs">
                {row.path}
                {'isWrite' in row && row.isWrite ? (
                  <Badge className="ml-2" color="amber" size="xs">
                    write
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground text-right text-xs">
                {row.line}:{row.column}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
