export default {
  displayName: 'unit',
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
  testMatch: ['**/src/__tests__/**/*.test.ts?(x)'],
  collectCoverageFrom: [
    'src/core/**/*.ts',
    'src/utils/**/*.ts',
    '!src/**/*.d.ts',
    '!src/bin/**',
    '!src/core/llm.ts',
    '!src/core/mcp.ts',
    '!src/core/query.ts',
    '!src/core/compile.ts',
    '!src/core/watch.ts',
    '!src/core/angela.ts',
    '!src/utils/parsers/marker.ts',
    '!src/utils/parsers/vision.ts',
    '!src/utils/parsers/url.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 60,
    },
    'src/core/**/*.ts': {
      lines: 90,
      branches: 80,
    },
    'src/utils/**/*.ts': {
      lines: 90,
      branches: 80,
    },
  },
};
