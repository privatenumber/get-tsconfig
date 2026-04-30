import Module from 'node:module';

/**
 * Returns the Yarn Berry pnp API if the current process is running under
 * one, else `undefined`.
 *
 * https://yarnpkg.com/advanced/pnpapi/#requirepnpapi
 */
export const getPnpApi = () => {
	const { findPnpApi } = Module;
	return findPnpApi && findPnpApi(process.cwd());
};
