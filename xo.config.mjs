import globals from 'globals';

const xoConfig = [
  {
    space: true,
  },
  {
    rules: {
      'promise/prefer-await-to-then': 0,
      'unicorn/no-array-reduce': 'off',
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
