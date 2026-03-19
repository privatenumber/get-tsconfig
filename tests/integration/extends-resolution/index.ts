import {
	describe, test, expect, onTestFinish,
} from 'manten';
import { createFixture } from 'fs-fixture';
import { readTsconfig } from '#get-tsconfig';
import { createTsconfigJson } from '../../utils/fixture-helpers.ts';
import { getTscTsconfig } from '../../utils/typescript-helpers.ts';

describe('resolves', () => {
	test('handles missing extends', async () => {
		await using fixture = await createFixture({
			'file.ts': '',
			'tsconfig.json': createTsconfigJson({
				extends: 'missing-package',
			}),
		});

		expect(
			() => readTsconfig(fixture.getPath('tsconfig.json')),
		).toThrow('File \'missing-package\' not found.');
	});

	describe('circularity', () => {
		test('self extend', async () => {
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
				() => readTsconfig(fixture.getPath('tsconfig.json')),
			).toThrow(errorMessage);
		});

		test('recursive', async () => {
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
				() => readTsconfig(fixture.getPath('tsconfig.json')),
			).toThrow('Circularity detected while resolving configuration:');
		});
	});

	test('extends array with common base', async () => {
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

		const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));
		expect(tsconfig).toStrictEqual(expectedTsconfig);
	});

	import('./relative-path.spec.ts');
	import('./absolute-path.spec.ts');
	import('./node-modules.spec.ts');
	import('./symbolic-link.spec.ts');
});
