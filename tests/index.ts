import { describe } from 'manten';

describe('get-tsconfig', () => {
	// Unit tests (fast, pure)
	import('./specs/normalize-compiler-options.ts');
	import('./specs/resolve-extends-chain.ts');
	import('./specs/paths-matcher.ts');
	import('./specs/files-matcher.ts');

	// Integration tests (filesystem, tsc)
	import('./specs/find-tsconfig.ts');
	import('./specs/get-tsconfig.ts');
	import('./specs/parse-tsconfig/index.ts');
	import('./specs/create-paths-matcher.ts');
	import('./specs/create-files-matcher.ts');
	import('./specs/extends-chain.ts');
});
