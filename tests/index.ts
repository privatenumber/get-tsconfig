import path from 'path';
import getTsconfig from '../src/index';
import { test, describe, expect } from 'manten';
import specErrors from './specs/errors.spec';
import specFindsConfig from './specs/finds-config.spec';
import specExtends from './specs/extends.spec';

// const nodeVersions = [
// 	'12.22.9',
// 	...(
// 		process.env.CI
// 			? [
// 				'14.18.3',
// 				'16.13.2',
// 			]
// 			: []
// 	),
// ];

(async () => {
	// for (const nodeVersion of nodeVersions) {
		// const node = await getNode(nodeVersion);
		await describe(`get-tsconfig`, ({ runTestSuite }) => {
			// runTestSuite(specErrors);
			// runTestSuite(specFindsConfig);
			runTestSuite(specExtends);
		});
	// }
})();
