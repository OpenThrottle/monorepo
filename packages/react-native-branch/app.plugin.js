'use strict';

/* eslint-disable @typescript-eslint/no-require-imports -- Expo config plugins are CommonJS entrypoints */
/**
 * @description Re-exports the official Expo config plugin so consuming apps register one plugin id:
 * `"plugins": ["@shiftsmartinc/react-native-branch"]`.
 * @see https://docs.expo.dev/versions/latest/sdk/branch/
 */
module.exports = require('@config-plugins/react-native-branch');
