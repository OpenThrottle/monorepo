import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, test } from 'vitest';

import { generatorReactRouterForm } from './generator.form';

describe('react-router form generator', () => {
  let tree: Tree;

  const application = 'openthrottle-developer';
  const folder = 'routing/home/components';
  const name = 'HomeExampleForm';

  const base = `applications/${application}/app/routing/home`;
  const componentPath = `${base}/components/HomeExampleForm.tsx`;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace();
    await generatorReactRouterForm(tree, { application, folder, name });
  });

  test('should emit the component, its test and its schema', () => {
    const emitted = tree.listChanges().map((change) => change.path);

    expect(emitted).toEqual(
      expect.arrayContaining([
        componentPath,
        `${base}/components/__tests__/HomeExampleForm.test.tsx`,
        `${base}/config/form.homeExample.ts`,
      ]),
    );
  });

  test('should compose the field from primitives shadcn actually exports', () => {
    const source = tree.read(componentPath, 'utf-8') ?? '';

    // `Error` was never an export of @openthrottle/react-router-shadcn; the
    // template importing it is what made every scaffolded form fail typecheck.
    expect(source).not.toMatch(/\bError\b/);
    expect(source).toContain('InlineErrors');

    // `Input` has no `label`/`error` props — a field is `Label` + `Input`, and
    // the invalid styling comes from `aria-invalid`.
    expect(source).toContain('<Label htmlFor="search">');
    expect(source).toContain('aria-invalid=');
    expect(source).not.toMatch(/^\s+label=/m);
    expect(source).not.toMatch(/^\s+error=/m);
  });

  test('should surface validation errors after a submit attempt', () => {
    const source = tree.read(componentPath, 'utf-8') ?? '';

    // Gating on `dirty` meant submitting a pristine invalid form rendered no
    // errors at all, which the generated test asserts against.
    expect(source).toContain('const hasSubmitted = submitCount > 0;');
    expect(source).not.toContain('const isDirty = dirty && submitCount > 0;');
    expect(source).not.toMatch(/const \{[^}]*\bdirty\b[^}]*\} = formik;/);
  });

  test('should import type-only bindings with `import type`', () => {
    const component = tree.read(componentPath, 'utf-8') ?? '';
    const schema =
      tree.read(`${base}/config/form.homeExample.ts`, 'utf-8') ?? '';

    expect(component).toContain(
      "import type { FormProps } from 'react-router';",
    );
    expect(component).toMatch(/import type \{ FormSchema \} from/);
    expect(schema).toContain("import type { FormikConfig } from 'formik';");
    expect(schema).toContain(
      "import type { InferType, ObjectSchema } from 'yup';",
    );
  });
});
