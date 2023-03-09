/** @type {import('ts-jest').JestConfigWithTsJest} */
const esModules = ['leaflet'].join('|');
module.exports = {
  transform: {
	[`(${esModules}).+\\.js$`]: "babel-jest",
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.ts?$': [
      'ts-jest',
      {
        // ts-jest configuration goes here
      },
    ],
  },
  testEnvironment: 'node',
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
};