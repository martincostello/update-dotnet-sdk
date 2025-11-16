import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vitest from '@vitest/eslint-plugin';
import github from 'eslint-plugin-github';
import globals from 'globals';

export default [
  github.getFlatConfigs().recommended,
  ...github.getFlatConfigs().typescript,
  {
    rules: {
      'github/array-foreach': 'error',
      'github/async-preventdefault': 'warn',
      'github/no-then': 'error',
      'github/no-blur': 'error',
    },
  },
  stylistic.configs['disable-legacy'],
  {
    files: ['**/*.cjs', '**/*.js', '**/*.mjs', '**/*.ts'],
    ignores: ['dist/*', 'lib/*', 'node_modules/*'],
    plugins: {
      vitest,
      '@stylistic': stylistic,
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
        ...globals.node,
      },
      parser: tsParser,
      ecmaVersion: 9,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      'camelcase': 'off',
      'i18n-text/no-en': 'off',
      'eslint-comments/no-use': 'off',
      'filenames/match-regex': 'off',
      'github/filenames-match-regex': 'off',
      'import/no-namespace': 'off',
      'no-unused-vars': 'off',
      'semi': 'off',
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/type-annotation-spacing': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
        },
      ],
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-qualifier': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/unbound-method': 'error',
    },
  },
];
