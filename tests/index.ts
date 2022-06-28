import { describe } from 'manten';

describe('get-tsconfig', ({ runTestSuite }) => {
	runTestSuite(import('./specs/get-tsconfig'));
	runTestSuite(import('./specs/create-paths-matcher'));
});
