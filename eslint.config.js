// ESLint "flat config" (the only format ESLint 10 supports). One config for
// the whole monorepo; workspace-specific tweaks go in extra objects below.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/node_modules/**',
    // Generated code: regenerated, never edited, so never linted.
    'packages/api-client/src/generated/**',
  ]),
  js.configs.recommended,
  // "TypeChecked" rules use the TS type information. The most valuable one
  // for Node is no-floating-promises: an un-awaited promise that rejects
  // becomes an unhandledRejection, which crashes the process by default.
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: { allowDefaultProject: ['*.js', '*.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        // `const { password, ...safe } = user` is a common way to drop a key.
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Supertest types res.body as `any`. In tests, asserting on that `any` is
    // the point, so the no-unsafe-* rules would only add noise there.
    files: ['**/tests/**/*.ts', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Must be last: turns off stylistic rules that would fight Prettier.
  prettier,
);
