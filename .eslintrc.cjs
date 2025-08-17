module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'prefer-const': 'error',
    'no-var': 'error',
    'no-unused-vars': 'warn',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
