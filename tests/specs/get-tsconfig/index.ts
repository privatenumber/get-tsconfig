import { testSuite } from 'manten';

export default testSuite(({ runTestSuite }) => {
	runTestSuite(import('./finds.spec.js'));
	runTestSuite(import('./parses.spec.js'));
	runTestSuite(import('./extends/index.js'));
});
