import * as React from 'react';
import { render } from '@testing-library/react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';

/**
 * @description Ensures Tabs primitives are reachable from the package public entry
 * (same import path app code uses) without deep paths into `src/components/Tabs`.
 */
describe('Tabs package exports', () => {
  it('exposes Tabs primitives from the package entry', () => {
    const { getByRole } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content</TabsContent>
      </Tabs>,
    );
    expect(getByRole('tablist')).toBeInTheDocument();
    expect(getByRole('tab', { name: 'A' })).toBeInTheDocument();
  });
});
