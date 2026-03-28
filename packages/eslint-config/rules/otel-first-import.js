// Custom ESLint rule: OTel must be the first import in service entry points
// Implements: T-AGENT-089, REQ-AGENT-092
// Applies to: apps/*/src/main.ts
// ADR: ADR-006 (observability stack)

/** @type {import('eslint').Rule.RuleModule} */
export const otelFirstImport = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Enforce './otel' as the first import in service entry points (REQ-AGENT-092)",
    },
    messages: {
      notFirstImport:
        "The first import in main.ts must be './otel' (REQ-AGENT-092). Found '{{source}}' instead.",
      missingOtelImport:
        "main.ts must import './otel' as its first import (REQ-AGENT-092).",
    },
    schema: [],
  },
  create(context) {
    /** @type {import('estree').ImportDeclaration[]} */
    const imports = [];

    return {
      ImportDeclaration(node) {
        imports.push(node);
      },
      'Program:exit'() {
        if (imports.length === 0) {
          context.report({
            node: context.sourceCode.ast,
            messageId: 'missingOtelImport',
          });
          return;
        }

        const firstImport = imports[0];
        if (firstImport.source.value !== './otel') {
          context.report({
            node: firstImport,
            messageId: 'notFirstImport',
            data: { source: String(firstImport.source.value) },
          });
        }
      },
    };
  },
};
