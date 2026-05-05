'use strict';

/* eslint-disable @typescript-eslint/no-require-imports -- Expo config plugins are CommonJS entrypoints */
/**
 * @description Re-exports the official Expo config plugin entry (`app.plugin.js`) so consuming apps
 * register a single plugin id: `"plugins": ["@shiftsmartinc/react-native-branch"]`.
 * @see https://docs.expo.dev/versions/latest/sdk/branch/
 */
module.exports = require('@config-plugins/react-native-branch/app.plugin.js');
