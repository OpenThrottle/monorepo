import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import { CoreFormRenderer } from '../src/components/CoreFormRenderer';
import { atomFragmentDraft } from '../src/data/data.atom.fragment-draft';
import { MOCK_FRAGMENT_RECORDS } from '../src/data/mock.fragment-records';
import type {
  CmsJsonSchema,
  CmsParsedSchema,
} from '../src/types/cms-json-schema';
import type { CmsFormChildren } from '../src/types/cms-render';
import { getFormFieldKind } from '../src/utils/getFormFieldKind';
import { getSchemaDefaults } from '../src/utils/getSchemaDefaults';
import { isCmsJsonSchema } from '../src/utils/parseCmsSchema';

/**
 * @description Every generated block schema (both block packages) must be editable by
 * `CoreFormRenderer`: each property maps to a field kind, and the form renders a pane per property
 * whose field mounts when opened. `block-schemas.test.ts` proves the schemas are valid; this proves
 * the form can edit them.
 */

const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const readJson = (path: string): unknown => {
  return JSON.parse(readFileSync(path, 'utf8'));
};

const require = createRequire(import.meta.url);
const SCHEMA_DIRS = [
  join(import.meta.dirname, '../schemas'),
  join(dirname(require.resolve('@openthrottle/react-router-cms-ui/package.json')), 'schemas'), // prettier-ignore
];

const readTypenames = (dir: string): readonly string[] => {
  const manifest = readJson(join(dir, 'manifest.json'));
  const schemas = isRecord(manifest) ? manifest['schemas'] : undefined;

  if (!Array.isArray(schemas)) return [];

  return schemas.flatMap((entry) => {
    const typename = isRecord(entry) ? entry['typename'] : undefined;

    return typeof typename === 'string' ? [typename] : [];
  });
};

const toParsedSchema = (
  typename: string,
  jsonSchema: CmsJsonSchema,
): CmsParsedSchema => {
  return {
    created_at: '2026-01-01T00:00:00.000Z',
    is_deleted: false,
    json_schema: jsonSchema,
    status: 'ACTIVE',
    typename,
    updated_at: '2026-01-01T00:00:00.000Z',
    uuid: `schema-${typename}`,
    version: 'test',
  };
};

const SCHEMAS = SCHEMA_DIRS.flatMap((dir) => {
  return readTypenames(dir).flatMap((typename) => {
    const jsonSchema = readJson(join(dir, `${typename}.schema.json`));

    return isCmsJsonSchema(jsonSchema)
      ? [{ schema: toParsedSchema(typename, jsonSchema), typename }]
      : [];
  });
});

/** Whatever a field renders, it renders at least one of these. */
const FIELD_CONTROLS = 'a, button, input, select, textarea';

const BINDINGS: CmsFormChildren = {
  addHref: '/add',
  fragments: MOCK_FRAGMENT_RECORDS,
  getFragmentHref: (fragment) => `/edit/${fragment.uuid}`,
  onRemove: vi.fn(),
  onReorder: vi.fn(),
};

const renderForm = (schema: CmsParsedSchema) => {
  const store = createStore();
  store.set(atomFragmentDraft, getSchemaDefaults(schema.json_schema));
  const Component = () => {
    return (
      <Provider store={store}>
        <DndProvider backend={HTML5Backend}>
          <CoreFormRenderer
            children={BINDINGS}
            className={undefined}
            fragmentUuid="fragment-1"
            header={undefined}
            intent="updateFragment"
            issues={undefined}
            schema={schema}
          />
        </DndProvider>
      </Provider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('form field coverage', () => {
  test('reads all 14 generated block schemas', () => {
    expect(SCHEMAS).toHaveLength(14);
  });
});

describe.each(SCHEMAS)('form field coverage: $typename', ({ schema }) => {
  const keys = Object.keys(schema.json_schema.properties ?? {});

  test.each(keys)('%s maps to a field kind', (key) => {
    expect(getFormFieldKind(key, schema.json_schema)).not.toBe('none');
  });

  test('renders one pane per property, each with a field once open', async () => {
    const component = renderForm(schema);
    const triggers = keys.map((key) => {
      return component.getByRole('button', { name: new RegExp(`^${key}`) });
    });

    expect(triggers).toHaveLength(keys.length);

    // One pane is open at a time; open each in turn (the first starts open, so skip its click).
    for (const [index, trigger] of triggers.entries()) {
      // eslint-disable-next-line no-await-in-loop -- each click must land before the next pane opens
      if (index > 0) await userEvent.click(trigger);

      const region = component.getByRole('region');

      expect(region.querySelector(FIELD_CONTROLS)).not.toBeNull();
    }
  });
});
