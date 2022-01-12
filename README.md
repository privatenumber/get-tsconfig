# get-tsconfig [![Latest version](https://badgen.net/npm/v/get-tsconfig)](https://npm.im/get-tsconfig) [![Monthly downloads](https://badgen.net/npm/dm/get-tsconfig)](https://npm.im/get-tsconfig) [![Install size](https://packagephobia.now.sh/badge?p=get-tsconfig)](https://packagephobia.now.sh/result?p=get-tsconfig) [![Bundle size](https://badgen.net/bundlephobia/minzip/get-tsconfig)](https://bundlephobia.com/result?p=get-tsconfig)

Find and/or parse the `tsconfig.json` file from a file or directory path.

### Features
- Uses TypeScript API under the hood so it's guaranteed to behave accurately
- Supports comments & dangling commas
- Resolves [`extends`](https://www.typescriptlang.org/tsconfig/#extends)
- Validates and throws parsing errors
- Tiny! `710 bytes`

## 🚀 Install

```bash
npm install --save-dev typescript get-tsconfig
```

## 🙋‍♀️ Why?
TypeScript exports methods to find and prase `tsconfig.json` but they're not well documented or discoverable. This could lead to others making custom implementations that don't meet feature parity with the TypeScript configuration spec.

This package exports a single function that finds and parses the `tsconfig.json` using TypeScript via peer dependency.

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

### getTsconfig(filePath?: string): Tsconfig
Returns the parsed TSConfig object. Throws an error if `tsconfig.json` cannot be found or it cannot be parsed.

#### filePath
Type: `string`

Default: `process.cwd()`

Accepts:
- Path to a file or directory to search up for a `tsconfig.json` file
- Path to the `tsconfig.json` file
