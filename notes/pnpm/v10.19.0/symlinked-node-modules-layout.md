# Symlinked `node_modules` layout

Source snapshot: pnpm 10.19.0 at
[`43d7b18c2fe0c91312407241f50a1f2e7364718f`](https://github.com/pnpm/pnpm/blob/43d7b18c2fe0c91312407241f50a1f2e7364718f/pnpm/package.json#L1-L5).

## Virtual-store locations

The standard virtual store defaults to `node_modules/.pnpm` under the lockfile directory
([context construction](https://github.com/pnpm/pnpm/blob/43d7b18c2fe0c91312407241f50a1f2e7364718f/pkg-manager/get-context/src/index.ts#L288-L300)).

For each resolved dependency graph node, pnpm creates a package-specific `node_modules` directory
inside that virtual store. The package's real directory is the package name joined onto that
directory
([dependency graph paths](https://github.com/pnpm/pnpm/blob/43d7b18c2fe0c91312407241f50a1f2e7364718f/pkg-manager/resolve-dependencies/src/resolvePeers.ts#L596-L624)).
For example:

```text
node_modules/.pnpm/shared-config@1.0.0/node_modules/shared-config
```

## Dependency edges

pnpm converts each graph node's child dependencies to their real package directories and sends
those paths, along with the node's package-specific `node_modules` directory, to the linking worker
([child path construction](https://github.com/pnpm/pnpm/blob/43d7b18c2fe0c91312407241f50a1f2e7364718f/pkg-manager/core/src/install/link.ts#L507-L537)).
The worker creates a symlink for every child alias in that directory
([worker linking](https://github.com/pnpm/pnpm/blob/43d7b18c2fe0c91312407241f50a1f2e7364718f/worker/src/start.ts#L319-L327),
[symlink target construction](https://github.com/pnpm/pnpm/blob/43d7b18c2fe0c91312407241f50a1f2e7364718f/fs/symlink-dependency/src/index.ts#L7-L24)).

A package dependency therefore appears beside the package's real directory, not inside the package
directory itself:

```text
node_modules/.pnpm/shared-config@1.0.0/node_modules/
├── base-config -> ../../base-config@1.0.0/node_modules/base-config
└── shared-config/
```

pnpm's installation tests assert this concrete transitive-dependency shape
([installation assertion](https://github.com/pnpm/pnpm/blob/43d7b18c2fe0c91312407241f50a1f2e7364718f/pkg-manager/core/test/install/misc.ts#L1028-L1042)).

Direct dependencies are linked separately from their real package directories into each project's
`node_modules`
([direct dependency linker](https://github.com/pnpm/pnpm/blob/43d7b18c2fe0c91312407241f50a1f2e7364718f/pkg-manager/direct-dep-linker/src/linkDirectDeps.ts#L112-L128)).
A consumer that directly depends only on `shared-config` therefore has this additional link:

```text
node_modules/shared-config -> .pnpm/shared-config@1.0.0/node_modules/shared-config
```

It does not receive a top-level `node_modules/base-config` link merely because `base-config` is a
dependency of `shared-config`.

## Resolution consequence

Resolving from the apparent path `node_modules/shared-config/tsconfig.json` and walking ancestor
`node_modules` directories does not reach the sibling `base-config` link in the virtual store.
Canonicalizing the package path first changes the starting directory to the real virtual-store
location, where normal ancestor lookup reaches:

```text
node_modules/.pnpm/shared-config@1.0.0/node_modules/base-config
```

A pnpm 10.19.0 installation using local package tarballs and `hoist=false` confirmed the distinction:

- the consumer's `shared-config` was a symlink into `node_modules/.pnpm`;
- `base-config` existed beside the real `shared-config` directory and resolved to its own virtual-store
  entry;
- `base-config` did not exist in the consumer's top-level `node_modules`.

Package-aware resolvers that continue resolution from a resolved package must therefore use its real
path to see the dependency neighborhood pnpm constructed for that package.
