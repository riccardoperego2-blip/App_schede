export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^@schede/exercise-selection$': '<rootDir>/../../packages/exercise-selection/src/index.ts',
    '^@schede/workout-generation$': '<rootDir>/../../packages/workout-generation/src/index.ts',
    '^@schede/workout-execution$': '<rootDir>/../../packages/workout-execution/src/index.ts',
    '^@shared/(.*)$': '<rootDir>/../../shared/$1',
  },
};
