import { testSuite } from 'manten';

export default testSuite('extends', ({ runTestSuite }) => {
	runTestSuite(import('./merges.spec.js'));
	runTestSuite(import('./resolves/index.js'));
});
