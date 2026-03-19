<p align="center">
	<img width="160" src=".github/logo.webp">
</p>
<h1 align="center">
	<sup>get-tsconfig</sup>
	<br>
	<a href="https://npm.im/get-tsconfig"><img src="https://badgen.net/npm/v/get-tsconfig"></a> <a href="https://npm.im/get-tsconfig"><img src="https://badgen.net/npm/dm/get-tsconfig"></a>
</h1>

Find and parse `tsconfig.json` files.

## Features
- Tiny! `9 kB` Minified + Gzipped
- Tested against TypeScript for correctness
- Resolves [`extends`](https://www.typescriptlang.org/tsconfig/#extends)
- Fully typed `tsconfig.json`
- Validates and throws parsing errors

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

TypeScript tooling (bundlers, linters, loaders, test runners) needs to read `tsconfig.json` to understand compiler options, path aliases, and file inclusion rules. But TypeScript's own config parser is buried inside the compiler and requires TypeScript as a dependency.

`get-tsconfig` provides the same functionality as a lightweight, standalone library — tested against TypeScript for correctness.

## Quick start

```ts
import { getTsconfig, isFileIncluded, resolvePathAlias } from 'get-tsconfig'

// Find and parse the nearest tsconfig.json
const tsconfig = getTsconfig()

// To resolve path aliases (compilerOptions.paths):
if (tsconfig) {
    const resolved = resolvePathAlias(tsconfig, '@/utils/helper')
    // → ['/project/src/utils/helper']
}

// To check if a file belongs to this tsconfig:
if (tsconfig && isFileIncluded(tsconfig, '/project/src/index.ts')) {
    // Use tsconfig.config.compilerOptions for transformation
}
```

## Finding & reading tsconfig

These functions find, read, and parse tsconfig files from the filesystem. All return a `TsconfigResult`:

```ts
type TsconfigResult<Config = TsconfigJsonResolved> = {
    path: string
    config: Config
    sources: string[]
}
```

- **path**: absolute path to the tsconfig file
- **config**: the fully resolved config (extends merged, options normalized)
- **sources**: paths of all tsconfig files that contributed to the resolved config via [`extends`](https://www.typescriptlang.org/tsconfig/#extends). When there are no `extends`, this is just `[path]`. Since `extends` can be an array, the order does not imply a linear chain.

### getTsconfig(searchPath?, options?)

Searches for a tsconfig file and parses it. If you already know the path, use [`readTsconfig`](#readtsconfigtsconfigpath-options) instead. Returns `undefined` if not found.

#### searchPath
Type: `string`

Default: `process.cwd()`

Path to a file or directory. The directory tree is searched up for `tsconfig.json`.

#### options
Type: `GetTsconfigOptions`

```ts
type GetTsconfigOptions = {
    configName?: string // default: 'tsconfig.json'
    cache?: Map<string, unknown>
    includes?: boolean // default: false
}
```

- **configName**: file name to search for (e.g. `'jsconfig.json'`)
- **cache**: snapshot cache for fs operations. Reusing after filesystem changes can return stale results.
- **includes**: when `true`, validates the file is a root file (matched by `include`/`files` globs, not excluded) before accepting the tsconfig. Matches VS Code's Language Server behavior. Default matches `tsc` CLI behavior (nearest tsconfig). Note: this checks glob matching only — a file can still be part of a TypeScript program via transitive imports even if not matched by `include`.

#### Example

```ts
import { getTsconfig } from 'get-tsconfig'

// Find from current directory
getTsconfig()

// Find from a file path
getTsconfig('./src/index.ts')

// Search for jsconfig.json
getTsconfig('.', { configName: 'jsconfig.json' })

// Language Server behavior — validate the file is included
getTsconfig('./src/index.ts', { includes: true })
```

### findTsconfig(searchPath?, options?)

Like `getTsconfig`, but returns only the path (`string | undefined`) without parsing. Same options.

```ts
import { findTsconfig } from 'get-tsconfig'

findTsconfig() // → '/project/tsconfig.json'
```

### readTsconfig(tsconfigPath, options?)

Reads and resolves a tsconfig at a known path. Used internally by `getTsconfig`.

```ts
type ReadTsconfigOptions = {
    cache?: Map<string, unknown>
}
```

```ts
import { readTsconfig } from 'get-tsconfig'

const { path, config } = readTsconfig('./tsconfig.json')
```

## Tsconfig `extends`

`readTsconfig` and `getTsconfig` fully resolve the [`extends`](https://www.typescriptlang.org/tsconfig/#extends) chain and return a flattened config. These two functions expose the chain for use cases like watch mode and config auditing.

### getExtendsChain(tsconfigPath, options?)

Collects the full extends chain. Returns an array of `TsconfigResult<TsconfigJson>` entries — each containing the raw (unmerged) config with `extends` resolved to absolute paths. (`TsconfigJson` is the raw tsconfig.json shape, including the `extends` field.)

`chain[0]` is the root. Ancestors follow in resolution order.

```ts
type GetExtendsChainOptions = {
    cache?: Map<string, unknown>
}
```

```ts
import { getExtendsChain } from 'get-tsconfig'

const chain = getExtendsChain('./tsconfig.json')
// [
//   { path: '/project/tsconfig.json', config: { extends: '/project/base.json', ... } },
//   { path: '/project/base.json', config: { ... } },
// ]

// Watch all files in the extends chain
const filesToWatch = chain.map(entry => entry.path)
```

### resolveExtendsChain(chain)

Merges a collected extends chain into a resolved tsconfig. Pure function — no filesystem access.

```ts
import { getExtendsChain, resolveExtendsChain } from 'get-tsconfig'

const chain = getExtendsChain('./tsconfig.json')

// Modify before merging
chain[0].config.compilerOptions = {
    ...chain[0].config.compilerOptions,
    sourceMap: true
}

const result = resolveExtendsChain(chain)
// TsconfigResult { path, config, sources }
```

## Working with a tsconfig

These functions take a parsed `TsconfigResult` (from `getTsconfig` or `readTsconfig`) and answer questions about it. They cache compiled state per tsconfig object — do not mutate the tsconfig after the first call.

### isFileIncluded(tsconfig, filePath)

Checks whether an absolute file path matches a tsconfig's `files`, `include`, and `exclude` globs — i.e., whether it's a **root file**. Case sensitivity is auto-detected from the filesystem. Non-absolute paths return `false`.

> [!NOTE]
> This checks glob matching only, not transitive imports. A file outside `include` can still be part of the TypeScript program if it's imported by a root file. `exclude` only filters the initial glob matching — it doesn't prevent transitively imported files from being compiled.

```ts
import { getTsconfig, isFileIncluded } from 'get-tsconfig'

const tsconfig = getTsconfig()

if (tsconfig && isFileIncluded(tsconfig, '/path/to/file.ts')) {
    // file is a root file of this tsconfig
}
```

### resolvePathAlias(tsconfig, specifier)

Resolves an [import specifier](https://nodejs.org/api/esm.html#terminology) against [`compilerOptions.paths`](https://www.typescriptlang.org/tsconfig#paths). Returns an array of possible file paths, or an empty array if no match. Does not perform actual file resolution.

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
