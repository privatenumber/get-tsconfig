import { testSuite, expect } from 'manten';
import { createFixture } from '../utils/create-fixture';
import { getTsconfig } from '#get-tsconfig'; // eslint-disable-line import/no-unresolved

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
