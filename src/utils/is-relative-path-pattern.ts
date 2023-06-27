// Only works on POSIX paths. Apply `slash` first.
export const isRelativePathPattern = /^\.{1,2}(\/.*)?$/;
