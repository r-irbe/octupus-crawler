// Shared ESLint configuration for IPF monorepo
// Implements: T-ARCH-016 (layer boundaries), T-ARCH-017 (no-cycle),
//             T-ARCH-018 (test boundaries), T-ARCH-019 (contracts purity)
// ADRs: ADR-015 (layered architecture), ADR-016 (coding standards)

import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '**/*.mjs'],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      'import-x': importX,
    },
    rules: {
      // --- TypeScript strict rules ---
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
      }],

      // --- T-ARCH-017: Circular dependency detection (ADR-016) ---
      'import-x/no-cycle': 'error',

      // --- T-ARCH-018: Test boundary — prod cannot import test files ---
      'import-x/no-restricted-paths': ['error', {
        zones: [
          {
            target: './**/!(*.test).ts',
            from: './**/*.test.ts',
            message: 'Production code must not import test files (REQ-ARCH-008).',
          },
        ],
      }],
    },
  },

  // --- T-ARCH-016: Layer boundary rules (REQ-ARCH-001, REQ-ARCH-003..005) ---
  // Core/Domain must not import from infrastructure or application layers
  {
    files: ['**/domain/**/*.ts', '**/errors/**/*.ts', '**/types/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'import-x/no-restricted-paths': ['error', {
        zones: [
          {
            target: './**/domain/**/*.ts',
            from: './**/infra/**',
            message: 'Core/Domain must not import Infrastructure (REQ-ARCH-003).',
          },
          {
            target: './**/domain/**/*.ts',
            from: './**/infrastructure/**',
            message: 'Core/Domain must not import Infrastructure (REQ-ARCH-003).',
          },
          {
            target: './**/domain/**/*.ts',
            from: './**/application/**',
            message: 'Core/Domain must not import Application (REQ-ARCH-003).',
          },
          {
            target: './**/errors/**/*.ts',
            from: './**/infra/**',
            message: 'Core/Errors must not import Infrastructure (REQ-ARCH-003).',
          },
          {
            target: './**/errors/**/*.ts',
            from: './**/infrastructure/**',
            message: 'Core/Errors must not import Infrastructure (REQ-ARCH-003).',
          },
          {
            target: './**/errors/**/*.ts',
            from: './**/application/**',
            message: 'Core/Errors must not import Application (REQ-ARCH-003).',
          },
        ],
      }],
    },
  },

  // Infrastructure must not import from application layer
  {
    files: ['**/infra/**/*.ts', '**/infrastructure/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'import-x/no-restricted-paths': ['error', {
        zones: [
          {
            target: './**/infra/**/*.ts',
            from: './**/application/**',
            message: 'Infrastructure must not import Application (REQ-ARCH-004).',
          },
          {
            target: './**/infrastructure/**/*.ts',
            from: './**/application/**',
            message: 'Infrastructure must not import Application (REQ-ARCH-004).',
          },
        ],
      }],
    },
  },

  // --- T-ARCH-019: Contracts purity — no runtime code (REQ-ARCH-002) ---
  {
    files: ['**/contracts/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: 'ClassDeclaration',
          message: 'Contracts layer must contain only types/interfaces — no class declarations (REQ-ARCH-002).',
        },
        {
          selector: 'FunctionDeclaration',
          message: 'Contracts layer must contain only types/interfaces — no function declarations (REQ-ARCH-002).',
        },
        {
          selector: 'VariableDeclaration[kind="let"]',
          message: 'Contracts layer must contain only types/interfaces — no let declarations (REQ-ARCH-002).',
        },
        {
          selector: 'VariableDeclaration[kind="var"]',
          message: 'Contracts layer must contain only types/interfaces — no var declarations (REQ-ARCH-002).',
        },
        {
          selector: 'VariableDeclarator > CallExpression',
          message: 'Contracts layer must contain only types/interfaces — no runtime function calls (REQ-ARCH-002).',
        },
        {
          selector: 'VariableDeclarator > NewExpression',
          message: 'Contracts layer must contain only types/interfaces — no runtime instantiation (REQ-ARCH-002).',
        },
      ],
    },
  },
);
