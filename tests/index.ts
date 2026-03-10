import { describe } from 'manten';

describe('get-tsconfig', () => {
	import('./specs/find-tsconfig.js');
	import('./specs/get-tsconfig.js');
	import('./specs/parse-tsconfig/index.js');
	import('./specs/create-paths-matcher.js');
	import('./specs/create-files-matcher.js');
});
