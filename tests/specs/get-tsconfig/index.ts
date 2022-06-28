import { testSuite } from 'manten';

export default testSuite(({ describe }) => {
	describe('get-tsconfig', ({ runTestSuite }) => {
		runTestSuite(import('./finds.spec'));
		runTestSuite(import('./extends.spec'));
	});
});
