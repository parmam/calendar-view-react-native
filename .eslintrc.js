/* eslint-env node */
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // Add prettier config last to override other formatting rules
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react', '@typescript-eslint', 'prettier'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error', // Enforces Prettier rules
    'no-trailing-spaces': 'error', // Disallow trailing whitespace
    'no-multiple-empty-lines': ['error', { max: 1 }], // Allow maximum 1 empty line
    'react/prop-types': 'off', // Disable prop-types as we use TypeScript
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
