/**
 * Configuração do Jest (ver docs/decisions/0015-framework-de-testes.md).
 *
 * O backend é ESM + TypeScript, então o Jest precisa de duas ajudas:
 *  - ts-jest no modo ESM, para entender TypeScript sem compilar antes;
 *  - moduleNameMapper, porque o código importa './text.js' mas o arquivo real é './text.ts'.
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}
