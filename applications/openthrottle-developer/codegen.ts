import {
  defineCodegen,
  type CodegenConfig,
} from '@openthrottle/graphql-codegen';

const config: CodegenConfig = defineCodegen({
  dirname: __dirname,
  documents: ['app/**/*.graphql', 'app/**/*.ts', '!app/__generated__/**/*'],
  outputDir: './app/__generated__/',
  presetConfig: {
    // `enumsAsTypes` makes this app's enums type-only unions (no runtime value).
    // `packages/openthrottle-developer-codegen/codegen.ts` runs a SECOND, divergent
    // codegen pass that intentionally OMITS this flag so its enums are runtime
    // objects — `PromptsTable.tsx` imports `CustomPromptType` from that package to
    // get `CustomPromptType.Agents` at runtime. See that file's header before
    // changing or "consolidating" these two configs.
    enumsAsTypes: true,
  },
});

export default config;
