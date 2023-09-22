/**
 * When a tsconfig extends another file with relative `paths` entries and the final tsconfig
 * doesn't have a `baseUrl` set, the relative paths are resolved relative to the tsconfig that
 * defined the `paths`
 *
 * However, this is impossible to compute from a flattened tsconfig, because we no longer know
 * the path of the tsconfig that defined the `paths` entry.
 *
 * This is why we store the implicit baseUrl in the flattened tsconfig, so that the pathsMatcher
 * can use it to resolve relative paths.
 */
export const implicitBaseUrlSymbol = Symbol('implicitBaseUrl');
