import { buildSchema, parse, validate, type ValidationRule } from 'graphql';
import { describe, expect, it } from 'vitest';
import { createQueryDepthLimitRule } from './query-depth-limit';

// A recursive schema: Node.children is a list of Node, so queries can nest
// arbitrarily deep — exactly the DoS shape the depth limit guards against.
const schema = buildSchema(`
  type Node {
    id: ID!
    name: String
    children: [Node!]!
  }

  type Query {
    root: Node
  }
`);

const validateWith = (query: string, maxDepth: number): readonly unknown[] => {
  const rule: ValidationRule = createQueryDepthLimitRule(maxDepth);

  return validate(schema, parse(query), [rule]);
};

describe('createQueryDepthLimitRule', () => {
  it('accepts a query at exactly the max depth', () => {
    // depth 2: root -> children -> children
    const query = `
      query Ok {
        root {
          children {
            children {
              id
            }
          }
        }
      }
    `;

    expect(validateWith(query, 3)).toHaveLength(0);
  });

  it('rejects a query that exceeds the max depth', () => {
    const query = `
      query TooDeep {
        root {
          children {
            children {
              children {
                id
              }
            }
          }
        }
      }
    `;

    const errors = validateWith(query, 2);

    expect(errors).toHaveLength(1);
    expect(String(errors[0])).toContain('maximum operation depth of 2');
    expect(String(errors[0])).toContain('TooDeep');
  });

  it('counts depth through fragment spreads', () => {
    const query = `
      query WithFragment {
        root {
          ...DeepChild
        }
      }

      fragment DeepChild on Node {
        children {
          children {
            id
          }
        }
      }
    `;

    // root -> children -> children -> id is depth 3, over the limit of 2.
    expect(validateWith(query, 2)).toHaveLength(1);
    expect(validateWith(query, 3)).toHaveLength(0);
  });

  it('does not infinitely recurse on cyclic fragments', () => {
    // Cyclic fragments are independently invalid GraphQL, but the depth rule
    // must terminate regardless rather than hanging the validator.
    const query = `
      query Cyclic {
        root {
          ...A
        }
      }

      fragment A on Node {
        children {
          ...A
        }
      }
    `;

    expect(() => validateWith(query, 2)).not.toThrow();
  });

  it('ignores introspection meta-fields when counting depth', () => {
    const query = `
      query Introspect {
        __schema {
          types {
            name
          }
        }
      }
    `;

    expect(validateWith(query, 1)).toHaveLength(0);
  });

  it('disables limiting when maxDepth is zero or negative', () => {
    const query = `
      query Deep {
        root {
          children {
            children {
              children {
                children {
                  id
                }
              }
            }
          }
        }
      }
    `;

    expect(validateWith(query, 0)).toHaveLength(0);
    expect(validateWith(query, -1)).toHaveLength(0);
  });
});
