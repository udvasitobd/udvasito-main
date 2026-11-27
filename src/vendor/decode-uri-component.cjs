// expo-router 57 → query-string 7 calls `require('decode-uri-component')(value)` (CommonJS). The patched release
// (0.5.1, GHSA DoS fix, forced through package.json "overrides") is ESM-only, so its function is `.default`.
// metro.config.js points query-string's import here; remove both when expo-router ships a fixed query-string.
const mod = require('decode-uri-component');

module.exports = typeof mod === 'function' ? mod : mod.default;
