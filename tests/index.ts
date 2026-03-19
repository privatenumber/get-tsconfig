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
	import('./integration/read-tsconfig.ts');
	import('./integration/extends-chain.ts');
	import('./integration/extends-merging.ts');
	import('./integration/extends-resolution/index.ts');
	import('./integration/paths-matcher-integration.ts');
	import('./integration/files-matcher-integration.ts');
});
