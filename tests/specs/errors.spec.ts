import { testSuite, expect } from 'manten';
import getTsconfig from '../../src/index';

export default testSuite(({ describe }) => {
	describe('error cases', ({ test }) => {
		test('tsconfig not found', () => {
			const tsconfig = getTsconfig('/');

			expect(tsconfig).toBe(null);
		});

		// cant read file (permissions?)

		// non json file - parsing error

		// extends not found
	});
});
