import { testSuite } from 'manten';

export default testSuite(({ runTestSuite }) => {
	runTestSuite(import('./parses.spec.js'));
	runTestSuite(import('./extends/index.js'));
});
