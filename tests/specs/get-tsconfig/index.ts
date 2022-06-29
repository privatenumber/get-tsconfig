import { testSuite } from 'manten';

export default testSuite(({ describe }) => {
	describe('get-tsconfig', ({ runTestSuite }) => {
		runTestSuite(import('./finds.spec.js'));
		runTestSuite(import('./parses.spec.js'));
		runTestSuite(import('./extends.spec.js'));
	});
});
