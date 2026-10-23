import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import { defineConfig } from 'eslint/config';

export default defineConfig({
  files: ['src/**/*.ts'],
  extends: [js.configs.recommended, typescriptEslint.configs['flat/recommended']],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: 'import',
        format: ['camelCase', 'PascalCase'],
      },
    ],

    curly: 'warn',
    eqeqeq: 'warn',
    'no-throw-literal': 'warn',
  },
});
