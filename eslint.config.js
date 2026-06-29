/* eslint-disable @typescript-eslint/no-require-imports */
const tseslint = require("typescript-eslint");

const globals = {
  AbortController: "readonly",
  ArrayBuffer: "readonly",
  Blob: "readonly",
  Buffer: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  document: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  Image: "readonly",
  navigator: "readonly",
  process: "readonly",
  React: "readonly",
  Response: "readonly",
  setTimeout: "readonly",
  window: "readonly"
};

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "out/**",
      "release/**",
      "dist/**",
      "build/**"
    ]
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-irregular-whitespace": "error",
      "no-prototype-builtins": "error",
      "no-sparse-arrays": "error",
      "valid-typeof": "error"
    }
  }
];
