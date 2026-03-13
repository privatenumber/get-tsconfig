<p align="center">
	<img width="160" src=".github/logo.webp">
</p>
<h1 align="center">
	<sup>get-tsconfig</sup>
	<br>
	<a href="https://npm.im/get-tsconfig"><img src="https://badgen.net/npm/v/get-tsconfig"></a> <a href="https://npm.im/get-tsconfig"><img src="https://badgen.net/npm/dm/get-tsconfig"></a>
</h1>

Find and parse `tsconfig.json` files.

### Features
- Zero dependency (not even TypeScript)
- Tested against TypeScript for correctness
- Supports comments & dangling commas in `tsconfig.json`
- Resolves [`extends`](https://www.typescriptlang.org/tsconfig/#extends)
- Fully typed `tsconfig.json`
- Validates and throws parsing errors
- Tiny! `7 kB` Minified + Gzipped

<br>

<p align="center">
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=398771"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/donate.webp"></a>
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=397608"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/sponsor.webp"></a>
</p>
<p align="center"><sup><i>Already a sponsor?</i> Join the discussion in the <a href="https://github.com/pvtnbr/get-tsconfig">Development repo</a>!</sup></p>

## Install

```bash
npm install get-tsconfig
```

## Why?
For TypeScript related tooling to correctly parse `tsconfig.json` file without depending on TypeScript.

## API

### getTsconfig(searchPath?, options?)

Searches for a tsconfig file (defaults to `tsconfig.json`) in the `searchPath` and parses it. (If you already know the tsconfig path, use [`readTsconfig`](#readtsconfigtsconfigpath-options) instead). Returns `undefined` if a config file cannot be found, or an object containing the path and parsed TSConfig object if found.

Returns:

```ts
type TsConfigResult<Config = TsConfigJsonResolved> = {
    path: string
    config: Config
}
```

#### searchPath
Type: `string`

Default: `process.cwd()`

Path to a source file or directory. The directory tree is searched up for a `tsconfig.json` file. Typically a TypeScript/JavaScript file path (e.g. `./src/index.ts`), but a directory path also works if you don't have a specific file.

#### options
Type:

```ts
type GetTsconfigOptions = {
    configName?: string
    cache?: Map<string, unknown>
    includes?: boolean
}
```

Default: `{}`

Optional search configuration.

##### configName
Type: `string`

Default: `tsconfig.json`

The file name of the TypeScript config file.

##### cache
Type: `Map<string, unknown>`

Default: `new Map()`

Optional snapshot cache for fs operations and resolution results. Reusing it after filesystem changes can return stale results.

##### includes
Type: `boolean`

Default: `false`

When `true` and `searchPath` is a file path, validates that the found tsconfig applies to the file (via `files`, `include`, and `exclude`). If the file isn't matched, continues searching parent directories.

By default, `getTsconfig` returns the nearest tsconfig — matching `tsc` CLI behavior ([`findConfigFile()`](https://github.com/microsoft/TypeScript/blob/b19a9da2a3b8/src/compiler/program.ts#L328)). With `includes`, it checks the file is included by `include`/`files` and not excluded by `exclude` before accepting the tsconfig — matching VS Code's TypeScript Language Server behavior ([`isMatchedByConfig()`](https://github.com/microsoft/TypeScript/blob/b19a9da2a3b8/src/server/editorServices.ts#L4486)).

#### Example

```ts
import { getTsconfig } from 'get-tsconfig'

// Searches for tsconfig.json starting in the current directory
console.log(getTsconfig())

// Find tsconfig.json from a TypeScript file path
console.log(getTsconfig('./path/to/index.ts'))

// Find tsconfig.json from a directory file path
console.log(getTsconfig('./path/to/directory'))

// Explicitly pass in tsconfig.json path
console.log(getTsconfig('./path/to/tsconfig.json'))

// Search for jsconfig.json - https://code.visualstudio.com/docs/languages/jsconfig
console.log(getTsconfig('.', { configName: 'jsconfig.json' }))

// Find the tsconfig that actually applies to a file (Language Server behavior)
// Skips tsconfig files where the file is excluded or not included
console.log(getTsconfig('./src/index.ts', {
    includes: true,
    cache: new Map()
}))
```

---

### findTsconfig(searchPath?, options?)

Searches for a tsconfig file by walking up the directory tree. Returns the path to the found tsconfig file, or `undefined` if not found.

Supports the same [`includes`](#includes) option as `getTsconfig` to validate that the tsconfig applies to the `searchPath` file.

#### searchPath
Type: `string`

Default: `process.cwd()`

Path to a source file or directory to search from.

#### options
Type:

```ts
type FindTsconfigOptions = {
    configName?: string
    cache?: Map<string, unknown>
    includes?: boolean
}
```

Default: `{}`

Same options as [`getTsconfig`](#gettsconfigsearchpath-options).

#### Example

```ts
import { findTsconfig } from 'get-tsconfig'

// Find the tsconfig.json path
findTsconfig()

// Search for a custom config file name
findTsconfig('.', { configName: 'jsconfig.json' })

// Find the tsconfig that includes the file
findTsconfig('./src/index.ts', {
    includes: true,
    cache: new Map()
})
```

---

### readTsconfig(tsconfigPath, options?)

Reads and resolves the tsconfig file at the given path. Used internally by `getTsconfig`. Returns a `TsConfigResult` object containing the resolved path and parsed config. The `path` property is the same resolved path used internally for `extends` resolution and `${configDir}` interpolation.

#### tsconfigPath
Type: `string`

Required path to the tsconfig file.

#### options
Type:

```ts
type ReadTsconfigOptions = {
    cache?: Map<string, unknown>
}
```

Default: `{}`

Optional snapshot cache for fs operations and resolution results. Reusing it after filesystem changes can return stale results.

#### Example

```ts
import { readTsconfig } from 'get-tsconfig'

// Must pass in a path to an existing tsconfig.json file
const { path, config } = readTsconfig('./path/to/tsconfig.custom.json')
```

---

### Tsconfig `extends`

`readTsconfig` and `getTsconfig` fully resolve the [`extends`](https://www.typescriptlang.org/tsconfig/#extends) chain and return a flattened config. These two functions expose the chain for use cases like watch mode (knowing which files to monitor for reloads) and config auditing (inspecting what each layer sets).

#### getExtendsChain(tsconfigPath, options?)

Collects the full extends chain for a tsconfig file. Returns an array of `TsConfigResult<TsConfigJson>` entries — each containing the raw (unmerged) config with `extends` resolved to absolute paths.

`chain[0]` is the root config. Ancestors follow in resolution order. The `extends` field in each entry is resolved to absolute paths, so you can navigate the graph by matching `extends` values to other entries' `path`.

##### tsconfigPath
Type: `string`

Required path to the tsconfig file.

##### options
Type:

```ts
type GetExtendsChainOptions = {
    cache?: Map<string, unknown>
}
```

Default: `{}`

Optional snapshot cache for fs operations and resolution results. Reusing it after filesystem changes can return stale results.

##### Example

Given this extends chain:

```
tsconfig.json → extends: "./base.json"
base.json     → extends: "@tsconfig/node20/tsconfig.json"
```

```ts
import { getExtendsChain } from 'get-tsconfig'

const chain = getExtendsChain('./tsconfig.json')
// [
//   {
//     path: '/project/tsconfig.json',
//     config: { extends: '/project/base.json', ... }
//   },
//   {
//     path: '/project/base.json',
//     config: { extends: '/project/node_modules/...', ... }
//   },
//   {
//     path: '/project/node_modules/.../tsconfig.json',
//     config: { ... }
//   },
// ]

// Watch all files in the extends chain
const filesToWatch = chain.map(entry => entry.path)
```

#### resolveExtendsChain(chain)

Merges a collected extends chain into a resolved tsconfig. Pure function — no filesystem access.

Expects the output of `getExtendsChain` or an equivalent acyclic, root-first chain with `extends` resolved to absolute paths.

##### chain
Type: `TsConfigResult<TsConfigJson>[]`

Array of unresolved tsconfig entries. `chain[0]` is the root config.

##### Example

```ts
import { getExtendsChain, resolveExtendsChain } from 'get-tsconfig'

const chain = getExtendsChain('./tsconfig.json')

// Inspect or modify the chain before merging
chain[0].config.compilerOptions = {
    ...chain[0].config.compilerOptions,
    sourceMap: true
}

const { path, config } = resolveExtendsChain(chain)
```

---

### isFileIncluded(tsconfig, filePath)

Checks whether an absolute file path is included by a tsconfig's `files`, `include`, and `exclude` settings. Case sensitivity is auto-detected from the filesystem.

Non-absolute paths return `false`.

Compiled patterns are cached per tsconfig object for performance. Do not mutate the tsconfig after the first call — create a new object instead.

#### tsconfig
Type: `TsConfigResult`

Pass in the return value from `getTsconfig` or `readTsconfig`.

#### filePath
Type: `string`

Absolute path to the file.

#### Example

```ts
import { getTsconfig, isFileIncluded } from 'get-tsconfig'

const tsconfig = getTsconfig()

if (tsconfig && isFileIncluded(tsconfig, '/path/to/file.ts')) {
    // file is included — use tsconfig.config.compilerOptions
}
```

---

### resolvePathAlias(tsconfig, specifier)

Resolves an [import specifier](https://nodejs.org/api/esm.html#terminology) against a tsconfig's [`compilerOptions.paths`](https://www.typescriptlang.org/tsconfig#paths) mappings.

Returns an array of possible file paths to check. Returns an empty array when no `paths` are configured or no pattern matches. This function only returns possible paths and doesn't do actual file resolution — compatible with any file/build system resolver.

Results are cached per tsconfig object. Do not mutate the tsconfig after the first call — create a new object instead.

#### tsconfig
Type: `TsConfigResult`

Pass in the return value from `getTsconfig` or `readTsconfig`.

#### specifier
Type: `string`

The import specifier to resolve (e.g. `@/utils/helper`).

#### Example

```ts
import { getTsconfig, resolvePathAlias } from 'get-tsconfig'

const tsconfig = getTsconfig()

const tryPaths = tsconfig && resolvePathAlias(tsconfig, '@/utils/helper')
if (tryPaths?.length) {
    // Check if paths in tryPaths exist
}
```

## FAQ

### How can I use TypeScript to parse `tsconfig.json`?
This package is a re-implementation of TypeScript's `tsconfig.json` parser.

However, if you already have TypeScript as a dependency, you can simply use it's API:

```ts
import {
    sys as tsSys,
    findConfigFile,
    readConfigFile,
    parseJsonConfigFileContent
} from 'typescript'

// Find tsconfig.json file
const tsconfigPath = findConfigFile(process.cwd(), tsSys.fileExists, 'tsconfig.json')

// Read tsconfig.json file
const tsconfigFile = readConfigFile(tsconfigPath, tsSys.readFile)

// Resolve extends
const parsedTsconfig = parseJsonConfigFileContent(
    tsconfigFile.config,
    tsSys,
    path.dirname(tsconfigPath)
)
```

## Sponsors
<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
