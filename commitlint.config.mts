import type { UserConfig } from '@commitlint/types';
// import nxScopes from '@commitlint/config-nx-scopes';
// import { RuleConfigSeverity } from '@commitlint/types';
// // const { utils: { getProjects } } = require('@commitlint/config-nx-scopes');

// const { getProjects } = nxScopes.utils;
// const customScopes = ['ci', 'release'];

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional', '@commitlint/config-nx-scopes'],
  rules: {
    // 'scope-enum': [
    //   async (ctx: any): Promise<[RuleConfigSeverity, 'always', string[]]> => [
    //     RuleConfigSeverity.Error,
    //     'always',
    //     [...getProjects(ctx), ...customScopes],
    //   ],
    // ] as any, // FIXME: This is a hack to bypass the strict static check for the async function
    // 'scope-enum': [
    //   async (ctx: any): Promise<[RuleConfigSeverity, 'always', string[]]> => [
    //     RuleConfigSeverity.Error,
    //     'always',
    //     [...(await getProjects(ctx)), ...customScopes],
    //   ],
    // ] as any, // FIXME: This is a hack to bypass the strict static check for the async function
    // 'type-enum': [RuleConfigSeverity.Error, 'always', ['foo']],
  },
  // ...
};

export default Configuration;
