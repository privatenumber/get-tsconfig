import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson, getTscTsconfig } from '../../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('resolves', ({ test, describe, runTestSuite }) => {
		test('handles missing extends', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					extends: 'missing-package',
				}),
			});

			expect(
				() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
			).toThrow('File \'missing-package\' not found.');
		});

		describe('circularity', ({ test }) => {
			test('self extend', async ({ onTestFinish }) => {
				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson({
						extends: './tsconfig.json',
					}),
					'file.ts': '',
				});
				onTestFinish(() => fixture.rm());

				const errorMessage = 'Circularity detected while resolving configuration';
				await expect(
					getTscTsconfig(fixture.path),
				).rejects.toThrow(errorMessage);
				expect(
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow(errorMessage);
			});

			test('recursive', async ({ onTestFinish }) => {
				await using fixture = await createFixture({
					'base.json': createTsconfigJson({
						extends: './tsconfig.json',
					}),
					'tsconfig.json': createTsconfigJson({
						extends: './base.json',
					}),
				});
				onTestFinish(() => fixture.rm());

				expect(
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow('Circularity detected while resolving configuration:');
			});
		});

		test('extends array with common base', async ({ onTestFinish }) => {
			await using fixture = await createFixture({
				'base.json': createTsconfigJson({}),
				'tsconfig-b.json': createTsconfigJson({
					extends: './base.json',
				}),
				'tsconfig-a.json': createTsconfigJson({
					extends: './base.json',
				}),
				'tsconfig.json': createTsconfigJson({
					extends: [
						'./tsconfig-a.json',
						'./tsconfig-b.json',
					],
				}),
				'file.ts': '',
			});
			onTestFinish(() => fixture.rm());

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		runTestSuite(import('./relative-path.spec.js'));
		runTestSuite(import('./absolute-path.spec.js'));
		runTestSuite(import('./node-modules.spec.js'));
		runTestSuite(import('./symbolic-link.spec.js'));
	});
});
