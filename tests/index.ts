import { describe } from 'manten';
import specErrors from './specs/errors.spec';
import specFindsConfig from './specs/finds-config.spec';
import specExtends from './specs/extends.spec';

describe('get-tsconfig', ({ runTestSuite }) => {
	runTestSuite(specErrors);
	runTestSuite(specFindsConfig);
	runTestSuite(specExtends);
});
