# `extends` resolution

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

## Accepted shape

`extends` accepts a string or array. Top-level `null` and `undefined` are rejected
([option declaration](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2307-L2316)).

A string resolves once. Array strings resolve in source order; other values are diagnosed except
`null` and `undefined`, which are ignored
([extends parsing](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3483-L3531)).
An empty string receives a dedicated diagnostic rather than the generic missing-file diagnostic
([path resolution](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3632-L3644)).

## Path classification

TypeScript normalizes slashes before classifying the request. Rooted disk paths and paths beginning
with `./` or `../` use direct filesystem resolution. It checks the exact path first, then appends
`.json` only when the exact path is absent and the request does not already end in `.json`
([direct resolution](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3612-L3631)).

Direct paths are not passed through package or directory-index resolution. Every other nonempty
string, including slash-containing strings without a leading dot, is treated as a module/package
reference
([classification boundary](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3612-L3644)).

## Package resolution mode

Package-valued config references always use TypeScript's NodeNext JSON resolver, independent of the
`moduleResolution` value eventually read from the config. This resolver enables NodeNext package
features, searches JSON, and marks the operation as a config lookup
([JSON config resolver](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1681-L1702),
[resolver entry](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1790-L1806)).

The resolver uses CommonJS-style NodeNext conditions: `require`, `types`, and `node`
([condition construction](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L752-L777),
[config resolver mode](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1811-L1836)).
Within a conditional exports object, key insertion order determines target priority; it is not
reordered to match the conditions array
([conditional target selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L2806-L2828)).

Bare package names climb ancestor `node_modules` directories. Scoped package names and subpaths are
split before selecting the package directory
([ancestor search](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L2987-L3034),
[package-name split](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3054-L3085)).

## Package exports and fallbacks

When a package has a truthy `exports` value, exports resolution takes precedence and blocks direct
file, directory, `tsconfig`, and index fallbacks. Falsy top-level values such as `null` do not enter
this branch
([exports branch](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3133-L3156),
[package fallback boundary](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L2611-L2646)).

Exports subpaths support exact keys, prefix keys, and one-star patterns with trailers. Targets must
remain valid package-relative paths, and a config lookup requires a JSON result
([subpath selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L2700-L2733),
[pattern resolution](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L2743-L2805),
[JSON requirement](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L2104-L2119)).

Without an applicable exports map, a root package may redirect through a nonempty string
`package.json#tsconfig` field. If that is absent, config lookup falls back to `tsconfig.json`
([package metadata](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L336-L401),
[config fallback](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L2481-L2544)).

The package-resolution fixture covers exports, the `tsconfig` field, package subpaths with and
without extensions, and implicit `tsconfig.json` in package roots and subdirectories
([fixture](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/configurationExtension.ts#L11-L110),
[assertions](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/configurationExtension.ts#L328-L336)).
A compiler case separately verifies wildcard exports mapping a package subpath to a JSON config
([case](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/cases/compiler/tsconfigExtendsPackageJsonExportsWildcard.ts#L4-L27),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/tsconfigExtendsPackageJsonExportsWildcard.errors.txt#L1-L29)).

## Extended-config cache

Extended configs can be cached by exact or lowercased path according to host case sensitivity. The
cache stores the JSON source file and parsed config; parse-diagnostic failures are also cached as a
source file without a parsed config
([cache lookup and write](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3646-L3675)).
