# get-tsconfig [![Latest version](https://badgen.net/npm/v/get-tsconfig)](https://npm.im/get-tsconfig)

Find and parse `tsconfig.json` files.

### Features
- Zero dependencies (not even TypeScript)
- Tested against TypeScript for accuracy
- Supports comments & dangling commas in `tsconfig.json`
- Resolves [`extends`](https://www.typescriptlang.org/tsconfig/#extends)
- Validates and throws parsing errors
- Tiny! `3 kB` Minified + Gzipped

## 🚀 Install

```bash
npm install get-tsconfig
```

## 🙋‍♀️ Why?
For TypeScript related tooling to correctly parse `tsconfig.json` file without depending on TypeScript.

## 👨‍🏫 Usage

```ts
import getTsconfig from 'get-tsconfig'

// Finds tsconfig.json in the current directory
console.log(getTsconfig())

// Find tsconfig.json from a TypeScript file path
console.log(getTsconfig('./path/to/index.ts'))

// Find tsconfig.json from a directory file path
console.log(getTsconfig('./path/to/directory'))

// Explicitly pass in tsconfig.json path
console.log(getTsconfig('./path/to/tsconfig.json'))
```

## ⚙️ API

### getTsconfig(searchPath?: string, configName?: string)
Searches for a `tsconfig.json` file and parses it. Returns `null` if a config file cannot be found, or an object containing the path and parsed TSConfig object if found.

Returns:

```ts
type TsconfigResult = {
    /**
     * The path to the tsconfig.json file
     */
    path: string | undefined

    /**
     * The resolved tsconfig.json file
     */
    config: TsConfigJsonResolved
} | null
```

#### searchPath
Type: `string`

Default: `process.cwd()`

Accepts a path to a file or directory to search up for a `tsconfig.json` file.

#### configName
Type: `string`

Default: `tsconfig.json`

The file name of the TypeScript config file.


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
