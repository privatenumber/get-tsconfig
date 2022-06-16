import { describe } from 'manten';

describe('get-tsconfig', ({ runTestSuite }) => {
	runTestSuite(import('./specs/errors.spec'));
	runTestSuite(import('./specs/finds-config.spec'));
	runTestSuite(import('./specs/extends.spec'));
	runTestSuite(import('./specs/paths.spec'));
});
