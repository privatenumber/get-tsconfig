import { testSuite } from 'manten';

export default testSuite('parseTsconfig', ({ runTestSuite }) => {
	runTestSuite(import('./parses.spec.js'));
	runTestSuite(import('./extends/index.js'));
});
