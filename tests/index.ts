import { describe } from 'manten';

describe('get-tsconfig', () => {
	// Unit tests (fast, pure)
	import('./unit/normalize-compiler-options.ts');
	import('./unit/resolve-extends-chain.ts');
	import('./unit/paths-matcher.ts');
	import('./unit/files-matcher.ts');

	// Integration tests (filesystem, tsc)
	import('./integration/find-tsconfig.ts');
	import('./integration/get-tsconfig.ts');
	import('./integration/parse-tsconfig/index.ts');
	import('./integration/create-paths-matcher.ts');
	import('./integration/create-files-matcher.ts');
	import('./integration/extends-chain.ts');
});
