import { describe } from 'manten';

describe('get-tsconfig', ({ runTestSuite }) => {
	runTestSuite(import('./specs/get-tsconfig.js'));
	runTestSuite(import('./specs/parse-tsconfig/index.js'));
	runTestSuite(import('./specs/create-paths-matcher.js'));
	runTestSuite(import('./specs/config-match-file.js'));
});
