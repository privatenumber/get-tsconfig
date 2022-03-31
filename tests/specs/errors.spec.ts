import { testSuite, expect } from 'manten';
import getTsconfig from '../../dist/index.js';
import { createFixture } from '../utils/create-fixture';

export default testSuite(({ describe }) => {
	describe('error cases', ({ test }) => {
		test('tsconfig not found', () => {
			const tsconfig = getTsconfig('/');

			expect(tsconfig).toBe(null);
		});

		test('non json file', async () => {
			const fixture = await createFixture({
				'tsconfig.json': 'asdf',
			});

			expect(() => getTsconfig(fixture.path)).toThrow('Failed to parse JSON');

			await fixture.cleanup();
		});
	});
});
