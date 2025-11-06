// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  // Base ignores
  {
    ignores: ['**/*.test.*', '**/*.spec.ts', 'node_modules/', 'dist/']
  },

  // ESLint base recommended
  eslint.configs.recommended,

  // TypeScript with type-aware rules
  ...tseslint.configs.recommendedTypeChecked,

  // Prettier integration
  prettier,

  // Language options
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.mjs', '*.js']
        },
        tsconfigRootDir: import.meta.dirname
      }
    }
  },

  // Project rules (merged from your .eslintrc + tweaks)
  {
    rules: {
      // TS rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Style rules ported from .eslintrc
      'object-curly-newline': [
        'error',
        {
          ObjectExpression: { minProperties: 4, multiline: true, consistent: true },
          ObjectPattern: { minProperties: 4, multiline: true, consistent: true },
          ImportDeclaration: { minProperties: 4, multiline: true, consistent: true },
          ExportDeclaration: { minProperties: 4, multiline: true, consistent: true }
        }
      ],
      'function-paren-newline': ['error', 'multiline-arguments'],

      // Console + unused
      'no-console': 'warn',

      // Prettier options (override defaults from the recommended preset)
      'prettier/prettier': [
        'error',
        {
          printWidth: 120,
          trailingComma: 'none',
          tabWidth: 2,
          useTabs: false,
          semi: true,
          singleQuote: true,
          bracketSpacing: true,
          arrowParens: 'always',
          proseWrap: 'always',
          endOfLine: 'lf'
        }
      ]
    }
  }
];
