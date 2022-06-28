export type StarPattern = {
	prefix: string;
	suffix: string;
};

export type PathEntry<T extends string | StarPattern> = {
	pattern: T;
	substitutions: string[];
};
