import { testSuite } from 'manten';

export default testSuite(({ describe }) => {
	describe('extends', ({ runTestSuite }) => {
		runTestSuite(import('./extends.spec.js'));
		runTestSuite(import('./resolves.spec.js'));
	});
});
