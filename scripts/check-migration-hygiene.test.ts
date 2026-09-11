import { describe, expect, it } from 'vitest';
import {
  findDuplicatePrefixCollisions,
  findGuardedForeignKeyStatements,
  hasGuardedForeignKey,
  migrationPrefix,
  splitStatements,
  stripComments,
} from './check-migration-hygiene.rules';

describe('splitStatements', () => {
  it('splits on top-level semicolons', () => {
    expect(splitStatements('SELECT 1; SELECT 2;')).toHaveLength(2);
  });

  it('ignores trailing whitespace-only fragments', () => {
    expect(splitStatements('SELECT 1;\n\n')).toHaveLength(1);
  });

  it('keeps a trailing statement that has no semicolon', () => {
    expect(splitStatements('SELECT 1; SELECT 2')).toHaveLength(2);
  });

  // The recommended fix is a DO block, whose body is full of semicolons. Splitting
  // inside one would report its REFERENCES as an unguarded inline declaration.
  it('does not split inside a $$-quoted body', () => {
    const sql = `
      DO $$
      BEGIN
        ALTER TABLE a ADD CONSTRAINT a_b_fkey FOREIGN KEY (b) REFERENCES c (id);
        RAISE NOTICE 'done';
      END
      $$;
    `;

    expect(splitStatements(sql)).toHaveLength(1);
  });
});

describe('stripComments', () => {
  it('removes line comments so prose keywords do not trip the rules', () => {
    const sql = '-- CREATE TABLE IF NOT EXISTS x REFERENCES y\nSELECT 1;';

    expect(stripComments(sql)).not.toContain('REFERENCES');
  });
});

describe('hasGuardedForeignKey', () => {
  it('flags an inline REFERENCES in CREATE TABLE IF NOT EXISTS', () => {
    expect(
      hasGuardedForeignKey(
        'CREATE TABLE IF NOT EXISTS tasks (plan_id UUID NOT NULL REFERENCES plans (id) ON DELETE CASCADE)',
      ),
    ).toBe(true);
  });

  it('flags an inline REFERENCES in ADD COLUMN IF NOT EXISTS', () => {
    expect(
      hasGuardedForeignKey(
        'ALTER TABLE plans ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects (id) ON DELETE SET NULL',
      ),
    ).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(
      hasGuardedForeignKey(
        'create table if not exists t (a uuid references b (id))',
      ),
    ).toBe(true);
  });

  it('allows an unguarded CREATE TABLE with an inline REFERENCES', () => {
    expect(
      hasGuardedForeignKey(
        'CREATE TABLE tasks (plan_id UUID REFERENCES plans (id))',
      ),
    ).toBe(false);
  });

  it('allows a guarded CREATE TABLE with no foreign key', () => {
    expect(
      hasGuardedForeignKey(
        'CREATE TABLE IF NOT EXISTS t (id UUID PRIMARY KEY)',
      ),
    ).toBe(false);
  });

  it('allows a separate ADD CONSTRAINT, which is the recommended fix', () => {
    expect(
      hasGuardedForeignKey(
        'ALTER TABLE tasks ADD CONSTRAINT tasks_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES plans (id) NOT VALID',
      ),
    ).toBe(false);
  });
});

describe('findGuardedForeignKeyStatements', () => {
  it('reports only the offending statement in a mixed file', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS good (id UUID PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS bad (other UUID REFERENCES good (id));
      CREATE INDEX IF NOT EXISTS idx_bad_other ON bad (other);
    `;

    const found = findGuardedForeignKeyStatements(sql);

    expect(found).toHaveLength(1);
    expect(found[0]).toContain('bad');
  });

  it('passes a file that adds its constraint in a guarded DO block', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS child (id UUID PRIMARY KEY, parent_id UUID NOT NULL);
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'child_parent_id_fkey') THEN
          ALTER TABLE child ADD CONSTRAINT child_parent_id_fkey
            FOREIGN KEY (parent_id) REFERENCES parent (id) ON DELETE CASCADE;
        END IF;
      END
      $$;
    `;

    expect(findGuardedForeignKeyStatements(sql)).toStrictEqual([]);
  });

  it('does not flag REFERENCES mentioned only in a comment', () => {
    const sql = `
      -- CREATE TABLE IF NOT EXISTS legacy (x UUID REFERENCES y (id))
      CREATE TABLE IF NOT EXISTS fine (id UUID PRIMARY KEY);
    `;

    expect(findGuardedForeignKeyStatements(sql)).toStrictEqual([]);
  });
});

describe('migrationPrefix', () => {
  it.each([
    ['099_restore_missing_foreign_keys.sql', '099'],
    ['084_create_rollout_flags.sql', '084'],
    ['001_enable_pgvector.sql', '001'],
  ])('reads %s as %s', (filename, expected) => {
    expect(migrationPrefix(filename)).toBe(expected);
  });
});

describe('findDuplicatePrefixCollisions', () => {
  const NONE: ReadonlySet<string> = new Set();

  // The regression this whole rule exists for. Branch A landed `110_a` while
  // branch B was open; B never rebased, so its merge-base has neither file and a
  // diff-scoped check sees the prefix used exactly once. Comparing against the
  // TIP of main is what makes B's half visible as incoming.
  it('fails the second of two concurrent branches, unrebased', () => {
    const collisions = findDuplicatePrefixCollisions(
      ['109_x.sql', '110_b.sql'],
      { baseFiles: ['109_x.sql', '110_a.sql'], kind: 'branch' },
      NONE,
    );

    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.prefix).toBe('110');
    expect(collisions[0]?.files).toStrictEqual(['110_a.sql', '110_b.sql']);
    // Only the branch's own file is renumberable — `110_a.sql` is applied history.
    expect(collisions[0]?.incoming).toStrictEqual(['110_b.sql']);
  });

  it('fails a branch that adds both halves itself', () => {
    const collisions = findDuplicatePrefixCollisions(
      ['110_a.sql', '110_b.sql'],
      { baseFiles: [], kind: 'branch' },
      NONE,
    );

    expect(collisions[0]?.incoming).toStrictEqual(['110_a.sql', '110_b.sql']);
  });

  // A pile that already exists wholly on main must not turn every unrelated PR
  // red. The trunk pass and the grandfather list own that case.
  it('stays silent on a collision that is entirely pre-existing on the base', () => {
    expect(
      findDuplicatePrefixCollisions(
        ['110_a.sql', '110_b.sql'],
        { baseFiles: ['110_a.sql', '110_b.sql'], kind: 'branch' },
        NONE,
      ),
    ).toStrictEqual([]);
  });

  // ...but the trunk pass DOES report it, which is the post-merge alarm that was
  // missing entirely: nothing re-checked main after a merge.
  it('reports a pre-existing collision in trunk mode', () => {
    const collisions = findDuplicatePrefixCollisions(
      ['110_a.sql', '110_b.sql'],
      { kind: 'trunk' },
      NONE,
    );

    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.incoming).toStrictEqual(['110_a.sql', '110_b.sql']);
  });

  it('stays silent on a grandfathered prefix in both scopes', () => {
    const grandfathered = new Set(['084']);

    expect(
      findDuplicatePrefixCollisions(
        ['084_a.sql', '084_b.sql'],
        { baseFiles: [], kind: 'branch' },
        grandfathered,
      ),
    ).toStrictEqual([]);
    expect(
      findDuplicatePrefixCollisions(
        ['084_a.sql', '084_b.sql'],
        { kind: 'trunk' },
        grandfathered,
      ),
    ).toStrictEqual([]);
  });

  it('passes a branch that touches no migration at all', () => {
    expect(
      findDuplicatePrefixCollisions(
        ['109_x.sql', '110_a.sql'],
        { baseFiles: ['109_x.sql', '110_a.sql'], kind: 'branch' },
        NONE,
      ),
    ).toStrictEqual([]);
  });

  // The union models the post-merge tree, so a file only main has still counts.
  it('counts a base-only file the working tree has never seen', () => {
    const collisions = findDuplicatePrefixCollisions(
      ['110_b.sql'],
      { baseFiles: ['110_a.sql'], kind: 'branch' },
      NONE,
    );

    expect(collisions[0]?.files).toStrictEqual(['110_a.sql', '110_b.sql']);
  });

  it('ignores non-.sql entries', () => {
    expect(
      findDuplicatePrefixCollisions(
        ['110_a.sql', '110_notes.md'],
        { kind: 'trunk' },
        NONE,
      ),
    ).toStrictEqual([]);
  });

  it('reports every colliding prefix, ordered', () => {
    const collisions = findDuplicatePrefixCollisions(
      ['111_a.sql', '111_b.sql', '110_a.sql', '110_b.sql'],
      { kind: 'trunk' },
      NONE,
    );

    expect(collisions.map(({ prefix }) => prefix)).toStrictEqual([
      '110',
      '111',
    ]);
  });
});
