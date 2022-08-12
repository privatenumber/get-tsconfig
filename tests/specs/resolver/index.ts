import fs from 'fs';
import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { getTscResolution } from '../../utils';

export default testSuite(({ describe }) => {
	describe('resolver', async ({ test, describe, runTestSuite }) => {
		runTestSuite(import('./error-cases.js'));
		runTestSuite(import('./resolve-extensionless.js'));
		runTestSuite(import('./resolve-js-jsx.js'));
		runTestSuite(import('./resolve-cjs-mjs.js'));
		runTestSuite(import('./resolve-directories.js'));
		runTestSuite(import('./resolve-directories-package-json.js'));
	});
});
