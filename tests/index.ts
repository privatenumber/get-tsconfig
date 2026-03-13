import { describe } from 'manten';

describe('get-tsconfig', () => {
	import('./specs/find-tsconfig.ts');
	import('./specs/get-tsconfig.ts');
	import('./specs/parse-tsconfig/index.ts');
	import('./specs/create-paths-matcher.ts');
	import('./specs/create-files-matcher.ts');
	import('./specs/extends-chain.ts');
});
