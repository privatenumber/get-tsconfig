import type { PnpApi } from '@yarnpkg/pnp';

declare module 'module' {
	export const findPnpApi: ((lookupSource: URL | string) => PnpApi | null) | undefined;
}
