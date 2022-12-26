const SLASH = '/';

export function parsePackageName(
	request: string,
) {
	const segments = request.split(SLASH);
	let packageName = segments.shift()!;
	if (packageName[0] === '@' && segments[0]) {
		packageName += SLASH + segments.shift();
	}

	return {
		packageName,
		packageSubpath: segments.join(SLASH),
	};
}
