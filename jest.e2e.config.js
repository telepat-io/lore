export default {
  displayName: 'e2e',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'esnext',
          jsx: 'react-jsx',
        },
      },
    ],
  },
  testMatch: ['**/e2e/**/*.e2e.ts'],
  testTimeout: 15000,
};
