import type { Config } from '@jest/types';

const commonProjectSettings: Config.InitialOptions = {
  rootDir: 'src',
  preset: 'ts-jest',
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['js', 'json', 'ts', 'node'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@ecoflow/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};

const config: Config.InitialOptions = {
  projects: [
    {
      ...commonProjectSettings,
      displayName: 'plugin-tests',
      testEnvironment: 'node',
      testMatch: ['**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/homebridge-ui/'],
      coveragePathIgnorePatterns: ['helpers/tests/', 'Simulator.ts', 'simulator.ts'],
    },
    {
      ...commonProjectSettings,
      displayName: 'homebridge-ui-tests',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/homebridge-ui/**/*.spec.ts'],
      coveragePathIgnorePatterns: ['webpack.config.ts'],
    },
  ],
};

export default config;
