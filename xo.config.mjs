import globals from 'globals';

const xoConfig = [
  {
    space: true,
  },
  {
    rules: {
      'promise/prefer-await-to-then': 0,
      'unicorn/no-array-reduce': 'off',
      '@stylistic/indent-binary-ops': ['error', 2],
    },
  },
  {
    files: ['test/**'],
    languageOptions: {
      globals: {...globals.node, ...globals.mocha},
    },
  },
];

export default xoConfig;
