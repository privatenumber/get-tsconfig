/**
 * Use indirect eval for compilers:
 * https://esbuild.github.io/content-types/#direct-eval
 *
 * eval is considered a security risk in the frontend.
 * In Node.js, dependencies can run potentially malicious
 * code even without eval.
 */
// eslint-disable-next-line no-eval
const indirectEval = eval;

export const safeEval = (expression: string) => indirectEval(`
	const emptyGlobal = new Proxy({}, {
		has: () => true,
	});
	with (emptyGlobal) {
		(${expression}\n)
	}
`);
