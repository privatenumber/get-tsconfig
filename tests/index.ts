import { describe } from 'manten';

describe('get-tsconfig', ({ runTestSuite }) => {
	runTestSuite(import('./specs/get-tsconfig/index.js'));
	runTestSuite(import('./specs/create-paths-matcher.js'));
});
